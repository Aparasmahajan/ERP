// Google Sheets datastore for the ERP.
//
// One shared workbook, one tab per entity, row 1 = headers. Every row carries `tenantId`
// so a single workbook serves all tenants (no per-tenant file juggling).
//
// Header names are used VERBATIM as object keys — there is deliberately no snake_case/
// camelCase conversion anywhere in this file. The previous Excel adapter camelCased on read
// and Title Cased on write, so keys did not survive a round trip; that class of bug is
// impossible here because HEADERS is the single source of truth for both directions.
//
// Setup:
//   1. Create a Google Sheet, copy its ID into GOOGLE_SHEETS_SPREADSHEET_ID
//   2. Share the sheet as Editor with GOOGLE_SERVICE_ACCOUNT_EMAIL
//   3. Set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (quoted, literal \n sequences are fine)
// Tabs and header rows are created on demand.

import { google, sheets_v4 } from 'googleapis';
import headers from './headers.json';

/**
 * Read the spreadsheet id lazily, per call. Capturing it in a module-level const breaks
 * whenever this module is imported before the environment is populated — ESM hoists
 * imports, so a script doing `config()` then `import` would see an empty value.
 */
function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set');
  return id;
}

/**
 * Column order per tab — the single source of truth, shared with scripts/initSheets.mjs
 * so the two can never drift. Order matters: it is the on-sheet column order, and both
 * row->object and object->row mapping are positional against this list.
 *
 * Tabs, in flow order:
 *   enquiries   — raised from a template, then accepted by a superadmin
 *   tenants     — a provisioned customer, created when an enquiry is accepted
 *   roles       — the role catalogue for a tenant
 *   role_grants — which capabilities each ROLE confers (the role->capability map)
 *   user_roles  — which roles a USER holds; separate tab so one user can hold several
 *   positions   — hierarchy, who reports to whom
 *   capabilities— per-person overrides layered on top of role_grants
 */
export const HEADERS: Record<string, string[]> = headers;

export type TabName = keyof typeof headers;

let _client: sheets_v4.Sheets | null = null;

function client(): sheets_v4.Sheets {
  if (_client) return _client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set');

  // Object form, not positional: google-auth-library v10 no longer binds the key when
  // passed positionally as JWT(email, undefined, key, scopes) — it throws
  // "No key or keyFile set." The `order` project uses v9, where positional still works.
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _client = google.sheets({ version: 'v4', auth });
  return _client;
}

/** True when all three Sheets env vars are present, so callers can degrade gracefully. */
export function isSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

// ── brief read cache, to stay well inside the Sheets read quota ──
const CACHE_TTL = 2500;
const cache = new Map<string, { at: number; rows: string[][] }>();
const ensured = new Set<string>();

/** Widest range we read. Generous enough for every tab above, with room to grow. */
const DATA_RANGE = 'A2:AZ';


/**
 * Sheets enforces a per-minute read/write quota per user. A burst of calls (provisioning a
 * tenant, or clearing one down) can trip it, so retry on 429 with exponential backoff
 * rather than surfacing a confusing "Quota exceeded" to the caller.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code;
      const isRateLimit = status === 429 || /quota|rate limit/i.test(err?.message ?? '');
      if (!isRateLimit || i === attempts - 1) throw err;
      lastErr = err;
      // 1s, 2s, 4s, 8s — the quota window is per minute, so this clears it.
      const waitMs = 1000 * 2 ** i;
      console.warn(`[sheets] ${label} rate-limited, retrying in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

async function ensureTab(tab: string): Promise<void> {
  if (ensured.has(tab)) return;
  if (!HEADERS[tab]) throw new Error(`Unknown tab "${tab}" — add it to HEADERS first`);

  const api = client();
  const meta = await api.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);

  if (!exists) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }

  // Write the header row if the tab is empty.
  const res = await api.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!1:1`,
  });
  if (!res.data.values || res.data.values.length === 0) {
    await api.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS[tab]] },
    });
  }

  ensured.add(tab);
}

async function readRows(tab: string): Promise<string[][]> {
  const c = cache.get(tab);
  if (c && Date.now() - c.at < CACHE_TTL) return c.rows;

  await ensureTab(tab);
  const res = await withRetry(`read ${tab}`, () =>
    client().spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${tab}!${DATA_RANGE}`,
    })
  );
  const rows = (res.data.values as string[][]) || [];
  cache.set(tab, { at: Date.now(), rows });
  return rows;
}

function toObjects<T>(tab: string, rows: string[][]): T[] {
  const headers = HEADERS[tab];
  return rows
    // Drop fully blank rows, which Sheets returns for trailing whitespace.
    .filter((r) => r.some((cell) => (cell ?? '') !== ''))
    .map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => (o[h] = r[i] ?? ''));
      return o as unknown as T;
    });
}

function rowFor(tab: string, obj: Record<string, unknown>): string[] {
  return HEADERS[tab].map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// ── public API ──

/** All rows in a tab, optionally narrowed to one tenant. */
export async function list<T>(tab: TabName, tenantId?: string): Promise<T[]> {
  const rows = toObjects<T>(tab as string, await readRows(tab as string));
  if (!tenantId) return rows;
  return rows.filter((r) => (r as Record<string, string>).tenantId === tenantId);
}

/** First row whose `field` equals `value`, or null. */
export async function findBy<T>(
  tab: TabName,
  field: string,
  value: string,
  tenantId?: string
): Promise<T | null> {
  const rows = await list<T>(tab, tenantId);
  const hit = rows.find((r) => (r as Record<string, string>)[field] === value);
  return hit ?? null;
}

export async function append<T extends object>(tab: TabName, obj: T): Promise<void> {
  await ensureTab(tab as string);
  await client().spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowFor(tab as string, obj as Record<string, unknown>)] },
  });
  cache.delete(tab as string);
}

/** Append many rows in one request. */
export async function appendMany<T extends object>(tab: TabName, objs: T[]): Promise<void> {
  if (objs.length === 0) return;
  await ensureTab(tab as string);
  await client().spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: objs.map((o) => rowFor(tab as string, o as Record<string, unknown>)) },
  });
  cache.delete(tab as string);
}

/**
 * Read-modify-write a single row matched on `keyCol`. Returns false when no row matched,
 * so callers can distinguish "updated" from "not found" instead of silently succeeding.
 */
export async function update(
  tab: TabName,
  keyCol: string,
  keyVal: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  await ensureTab(tab as string);
  const res = await client().spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!${DATA_RANGE}`,
  });
  const rows = (res.data.values as string[][]) || [];
  const headers = HEADERS[tab as string];
  const keyIdx = headers.indexOf(keyCol);
  if (keyIdx < 0) throw new Error(`Column "${keyCol}" is not in tab "${tab}"`);

  const rowIdx = rows.findIndex((r) => (r[keyIdx] ?? '') === keyVal);
  if (rowIdx < 0) return false;

  const current: Record<string, string> = {};
  headers.forEach((h, i) => (current[h] = rows[rowIdx][i] ?? ''));

  await client().spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    // +2 because rows are 1-indexed and row 1 is the header.
    range: `${tab}!A${rowIdx + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowFor(tab as string, { ...current, ...patch })] },
  });
  cache.delete(tab as string);
  return true;
}

export async function remove(tab: TabName, keyCol: string, keyVal: string): Promise<boolean> {
  await ensureTab(tab as string);
  const api = client();
  const meta = await api.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === tab)?.properties?.sheetId;
  if (sheetId == null) return false;

  const res = await api.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!${DATA_RANGE}`,
  });
  const rows = (res.data.values as string[][]) || [];
  const keyIdx = HEADERS[tab as string].indexOf(keyCol);
  if (keyIdx < 0) throw new Error(`Column "${keyCol}" is not in tab "${tab}"`);

  const rowIdx = rows.findIndex((r) => (r[keyIdx] ?? '') === keyVal);
  if (rowIdx < 0) return false;

  await api.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx + 1, // 0-indexed, +1 to skip the header
              endIndex: rowIdx + 2,
            },
          },
        },
      ],
    },
  });
  cache.delete(tab as string);
  return true;
}


/**
 * Delete every row matching `predicate` in a single batchUpdate.
 *
 * Calling remove() in a loop costs 3 API calls per row and will trip the per-minute quota
 * on any realistic dataset — clearing one provisioned tenant is well over 100 rows. This
 * does one read plus one write regardless of how many rows match.
 *
 * Ranges are deleted in DESCENDING row order: deleting top-down would shift every
 * subsequent index up by one and silently remove the wrong rows.
 */
export async function removeWhere<T>(
  tab: TabName,
  predicate: (row: T) => boolean
): Promise<number> {
  await ensureTab(tab as string);
  const api = client();

  const meta = await withRetry('meta', () => api.spreadsheets.get({ spreadsheetId: spreadsheetId() }));
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === tab)?.properties?.sheetId;
  if (sheetId == null) return 0;

  const rows = await readRows(tab as string);
  const objs = toObjects<T>(tab as string, rows);
  const headers = HEADERS[tab as string];

  // Map object index back to physical row index, skipping the blank rows toObjects drops.
  const physical: number[] = [];
  let objIdx = 0;
  rows.forEach((r, i) => {
    if (!r.some((cell) => (cell ?? '') !== '')) return;
    if (predicate(objs[objIdx])) physical.push(i);
    objIdx++;
  });

  if (physical.length === 0) return 0;

  const requests = physical
    .slice()
    .sort((a, b) => b - a)
    .map((i) => ({
      deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 },
      },
    }));

  await withRetry(`delete ${physical.length} from ${tab}`, () =>
    api.spreadsheets.batchUpdate({ spreadsheetId: spreadsheetId(), requestBody: { requests } })
  );
  cache.delete(tab as string);
  return physical.length;
}

/** Every row for one tenant, across the given tabs. One read + one write per tab. */
export async function purgeTenant(tenantId: string, tabs: TabName[]): Promise<Record<string, number>> {
  const removed: Record<string, number> = {};
  for (const tab of tabs) {
    removed[tab as string] = await removeWhere<{ tenantId?: string }>(
      tab,
      (r) => r.tenantId === tenantId
    );
  }
  return removed;
}

/** Append one audit row. Never throws — auditing must not break the operation it records. */
export async function audit(entry: {
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}): Promise<void> {
  try {
    await append('audit', {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: entry.tenantId,
      timestamp: new Date().toISOString(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      before: entry.before ? JSON.stringify(entry.before) : '',
      after: entry.after ? JSON.stringify(entry.after) : '',
      reason: entry.reason || '',
    });
  } catch (err) {
    console.error('[audit] failed to write audit row:', err);
  }
}

/** Create every tab with its header row. Idempotent. */
export async function initAllTabs(): Promise<string[]> {
  const created: string[] = [];
  for (const tab of Object.keys(HEADERS)) {
    await ensureTab(tab);
    created.push(tab);
  }
  return created;
}

export function clearCache(): void {
  cache.clear();
  ensured.clear();
}
