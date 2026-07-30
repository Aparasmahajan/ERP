#!/usr/bin/env node
/**
 * Create every ERP tab (with its header row) in the Google Sheet, then read them back.
 *
 * Run: npm run init-sheets
 *
 * Requires in .env.local:
 *   GOOGLE_SHEETS_SPREADSHEET_ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Minimal .env.local loader so this runs outside Next's runtime.
function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!existsSync(file)) {
    console.error('✗ No .env.local found in', process.cwd());
    process.exit(1);
  }
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip one layer of surrounding quotes, keeping inner \n sequences intact.
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length > 1) ||
      (val.startsWith("'") && val.endsWith("'") && val.length > 1)
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Single source of truth, shared with lib/sheets/erpSheets.ts — no hand-copied duplicate.
const HEADERS = JSON.parse(
  readFileSync(path.join(process.cwd(), 'lib', 'sheets', 'headers.json'), 'utf8')
);

async function main() {
  loadEnv();

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const missing = [];
  if (!spreadsheetId) missing.push('GOOGLE_SHEETS_SPREADSHEET_ID');
  if (!email) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!key) missing.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  if (missing.length) {
    console.error('✗ Missing in .env.local:', missing.join(', '));
    process.exit(1);
  }
  if (!key.includes('BEGIN PRIVATE KEY')) {
    console.error('✗ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY does not look like a PEM key.');
    console.error('  Expected it to contain "-----BEGIN PRIVATE KEY-----".');
    process.exit(1);
  }

  console.log('Spreadsheet :', spreadsheetId);
  console.log('Service acct:', email);
  console.log('');

  // Object form is required on google-auth-library v10+ (positional args no longer
  // bind the key and fail with "No key or keyFile set.").
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Fail fast with a clear message if the credentials themselves are bad, so a 403
  // later can be read unambiguously as "sheet not shared".
  try {
    await auth.authorize();
  } catch (err) {
    console.error('✗ Could not authenticate the service account:', err?.message || err);
    console.error('  The private key is likely malformed. Copy it verbatim from the JSON.');
    process.exit(1);
  }

  const api = google.sheets({ version: 'v4', auth });

  let meta;
  try {
    meta = await api.spreadsheets.get({ spreadsheetId });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('✗ Cannot open the spreadsheet:', msg);
    if (msg.includes('403') || /permission/i.test(msg)) {
      console.error('');
      console.error(`  Share the sheet as EDITOR with: ${email}`);
    } else if (msg.includes('404')) {
      console.error('');
      console.error('  Check GOOGLE_SHEETS_SPREADSHEET_ID — that sheet was not found.');
    } else if (/invalid_grant|DECODER|PEM/i.test(msg)) {
      console.error('');
      console.error('  The private key looks malformed. Copy it verbatim from the service-account JSON.');
    }
    process.exit(1);
  }

  console.log(`✓ Connected: "${meta.data.properties?.title}"`);
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title));
  console.log(`  Existing tabs: ${existing.size ? [...existing].join(', ') : '(none)'}`);
  console.log('');

  // Create any missing tabs in one batch.
  const toCreate = Object.keys(HEADERS).filter((t) => !existing.has(t));
  if (toCreate.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    console.log(`+ Created ${toCreate.length} tab(s): ${toCreate.join(', ')}`);
  } else {
    console.log('· All tabs already present');
  }

  // Write header rows where row 1 is empty.
  let headersWritten = 0;
  for (const [tab, headers] of Object.entries(HEADERS)) {
    const res = await api.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
    if (!res.data.values || res.data.values.length === 0) {
      await api.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
      headersWritten++;
    }
  }
  console.log(`+ Header rows written: ${headersWritten}`);
  console.log('');

  // Migrate tabs whose header row is an older, shorter version of the expected one.
  // ensureTab only writes headers when row 1 is empty, so a column added to headers.json
  // later would never appear on an existing tab. Only trailing columns are appended —
  // inserting mid-list would shift every existing row's positional mapping.
  let migrated = 0;
  for (const [tab, expected] of Object.entries(HEADERS)) {
    const res = await api.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
    const actual = res.data.values?.[0] || [];
    if (actual.length === 0 || actual.length >= expected.length) continue;

    const isPrefix = actual.every((h, i) => h === expected[i]);
    if (!isPrefix) continue; // diverged in a way we cannot safely auto-fix

    await api.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [expected] },
    });
    const added = expected.slice(actual.length);
    console.log(`~ ${tab}: added column(s) ${added.join(', ')}`);
    migrated++;
  }
  if (migrated) console.log(`+ Migrated ${migrated} tab(s)
`);

  // Read every tab back and confirm the headers match what we intended.
  console.log('Verifying tabs:');
  let bad = 0;
  for (const [tab, expected] of Object.entries(HEADERS)) {
    const res = await api.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
    const actual = res.data.values?.[0] || [];
    const ok = expected.length === actual.length && expected.every((h, i) => h === actual[i]);
    const dataRes = await api.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A2:AZ` });
    const dataRows = (dataRes.data.values || []).filter((r) => r.some((c) => (c ?? '') !== ''));
    console.log(
      `  ${ok ? '✓' : '✗'} ${tab.padEnd(17)} ${String(actual.length).padStart(2)} cols, ${String(dataRows.length).padStart(3)} rows`
    );
    if (!ok) {
      bad++;
      console.log(`      expected: ${expected.join(', ')}`);
      console.log(`      actual  : ${actual.join(', ')}`);
    }
  }

  console.log('');
  if (bad) {
    console.error(`✗ ${bad} tab(s) have unexpected headers. Fix or delete those tabs and re-run.`);
    process.exit(1);
  }
  console.log(`✓ All ${Object.keys(HEADERS).length} tabs verified.`);
  console.log(`  https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
}

main().catch((err) => {
  console.error('✗ Unexpected failure:', err?.message || err);
  process.exit(1);
});
