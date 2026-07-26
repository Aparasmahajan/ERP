/**
 * Turn an accepted enquiry into a working tenant in Google Sheets.
 *
 * This is the step that was entirely missing: previously the template a visitor chose
 * influenced nothing server-side. Now the chosen template's roles, people and features are
 * what actually get written.
 *
 * Everything a tenant needs to be usable on day one:
 *   tenants        one row, keyed by a URL-safe slug (the portal routes on slug)
 *   org_units      a root unit
 *   roles          the template's role catalogue
 *   role_grants    which capabilities each role confers  <- makes permissions real
 *   users          the template's people, plus the admin from the enquiry
 *   user_roles     who holds which role                  <- makes role assignment real
 *   positions      reporting lines
 *   module_features the template's feature list
 *   branding       default colours
 *
 * Writes are grouped per tab with appendMany to keep the Sheets API call count low.
 */

import { append, appendMany, list, audit } from '@/lib/sheets/erpSheets';
import { presetFor } from '@/lib/capabilities/catalogue';
import { TEMPLATE_DEMOS } from '@/lib/seeds/templateDemos';
import { resolveSeedKey } from '@/lib/templates/resolve';

export interface ProvisionInput {
  templateId: string;
  orgName: string;
  adminName: string;
  adminEmail: string;
  /** Superadmin id/email performing the provisioning, recorded in the audit trail. */
  actorId: string;
  pack?: string;
}

export interface ProvisionResult {
  tenantId: string;
  slug: string;
  adminUserId: string;
  counts: {
    roles: number;
    roleGrants: number;
    users: number;
    userRoles: number;
    positions: number;
    orgUnits: number;
    features: number;
  };
}

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * A slug not already taken in the `tenants` tab. The portal routes on slug, so a collision
 * would silently point two customers at the same URL.
 */
async function uniqueSlug(base: string): Promise<string> {
  const taken = new Set(
    (await list<{ slug: string }>('tenants')).map((t) => (t.slug || '').toLowerCase())
  );
  const root = slugify(base) || 'tenant';
  if (!taken.has(root)) return root;
  for (let n = 2; n < 500; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Astronomically unlikely; fall back to something guaranteed distinct.
  return `${root}-${Date.now().toString(36)}`;
}

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  // Accepts either a catalogue id or a seed key; three catalogue entries have no seed of
  // their own and resolve to the nearest fit.
  const seedKey = resolveSeedKey(input.templateId);
  if (!seedKey) throw new Error(`Unknown template "${input.templateId}"`);
  const template = (TEMPLATE_DEMOS as Record<string, any>)[seedKey];

  const tenantId = id('ten');
  const slug = await uniqueSlug(input.orgName);
  const now = new Date().toISOString();
  const orgName = input.orgName || template.tenant?.name || 'New Organisation';
  const pack = input.pack || template.tenant?.pack || 'ORGANISATION';

  // ── tenant ──
  await append('tenants', {
    id: tenantId,
    slug,
    name: orgName,
    templateId: input.templateId,
    pack,
    status: 'ACTIVE',
    adminEmail: input.adminEmail,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    createdAt: now,
    createdBy: input.actorId,
  });

  // ── root org unit ──
  const rootUnitId = id('ou');

  // ── roles + their capability grants ──
  const templateRoles: any[] = template.roles || [];
  const roleRows = templateRoles.map((r, i) => ({
    id: id('role'),
    tenantId,
    key: r.code,
    title: r.name,
    pack,
    // Rank descends down the template's list: first role is most senior.
    rank: Math.max(0, 9 - i),
    kind: 'LINE',
    mayHoldReports: i < templateRoles.length - 1,
    maxDelegableRank: Math.max(0, 8 - i),
    color: r.color || 'bg-gray-500',
    system: true,
  }));

  const grantRows = roleRows.flatMap((role, i) =>
    presetFor(i, roleRows.length).map((g) => ({
      id: id('rg'),
      tenantId,
      roleId: role.id,
      capability: g.capability,
      scope: g.scope,
      canDelegate: i === 0, // only the top role may hand powers onward by default
    }))
  );

  // ── people ──
  const roleIdByTitle = new Map(roleRows.map((r) => [r.title, r.id]));
  const templateUsers: any[] = template.users || [];

  const adminUserId = id('usr');
  const adminRoleId = roleRows[0]?.id ?? '';

  // The admin from the enquiry sits at the top and holds the most senior role.
  const userRows = [
    {
      id: adminUserId,
      tenantId,
      code: 'ADMIN001',
      name: input.adminName || 'Administrator',
      email: input.adminEmail,
      phone: '',
      passwordHash: '',
      status: 'INVITED', // becomes ACTIVE once they accept the invite
      avatarUrl: '',
      createdAt: now,
      createdBy: input.actorId,
    },
    // The template's sample people, so the tenant is not an empty shell on first login.
    ...templateUsers.map((u) => ({
      id: id('usr'),
      tenantId,
      code: u.code,
      name: u.name,
      email: `${String(u.code).toLowerCase()}@${slug}.example`,
      phone: '',
      passwordHash: '',
      status: u.status || 'ACTIVE',
      avatarUrl: '',
      createdAt: now,
      createdBy: input.actorId,
    })),
  ];

  // Role assignments. Templates name the role, so map name -> id; fall back to the most
  // junior role rather than leaving anyone unassigned.
  const fallbackRoleId = roleRows[roleRows.length - 1]?.id ?? adminRoleId;
  const userRoleRows = userRows.map((u, i) => ({
    id: id('ur'),
    tenantId,
    userId: u.id,
    roleId: i === 0 ? adminRoleId : roleIdByTitle.get(templateUsers[i - 1]?.role) || fallbackRoleId,
    validFrom: now,
    validTo: '',
    isActing: false,
    assignedBy: input.actorId,
    assignedAt: now,
  }));

  // Reporting lines: admin at the root, everyone else under them to start.
  const positionRows = userRows.map((u, i) => ({
    id: id('pos'),
    tenantId,
    userId: u.id,
    reportsToUserId: i === 0 ? '' : adminUserId,
    orgUnitId: rootUnitId,
    titleOverride: '',
    validFrom: now,
    validTo: '',
    sessionId: `SESSION_${new Date().getFullYear()}`,
  }));

  const featureRows = (template.features || []).map((f: string, i: number) => ({
    tenantId,
    featureId: `feat_${slugify(f)}`,
    name: f,
    category: 'Template',
    enabled: i < 4,
    description: `${f} for ${orgName}`,
    phase: 1,
  }));

  // ── write everything ──
  await appendMany('org_units', [
    {
      id: rootUnitId,
      tenantId,
      name: orgName,
      parentUnitId: '',
      kind: 'DIVISION',
      code: 'HQ',
      headUserId: adminUserId,
      status: 'ACTIVE',
    },
  ]);
  await appendMany('roles', roleRows);
  await appendMany('role_grants', grantRows);
  await appendMany('users', userRows);
  await appendMany('user_roles', userRoleRows);
  await appendMany('positions', positionRows);
  await appendMany('module_features', featureRows);
  await appendMany('branding', [
    { tenantId, key: 'primaryColor', value: '#2563eb', updatedAt: now, updatedBy: input.actorId },
    { tenantId, key: 'secondaryColor', value: '#7c3aed', updatedAt: now, updatedBy: input.actorId },
    { tenantId, key: 'logoUrl', value: '', updatedAt: now, updatedBy: input.actorId },
  ]);

  await audit({
    tenantId,
    action: 'CREATE',
    entityType: 'tenant',
    entityId: tenantId,
    actorId: input.actorId,
    after: { slug, orgName, templateId: input.templateId },
    reason: 'Provisioned from accepted enquiry',
  });

  return {
    tenantId,
    slug,
    adminUserId,
    counts: {
      roles: roleRows.length,
      roleGrants: grantRows.length,
      users: userRows.length,
      userRoles: userRoleRows.length,
      positions: positionRows.length,
      orgUnits: 1,
      features: featureRows.length,
    },
  };
}
