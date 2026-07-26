/**
 * Tenant portal auth chain, over real HTTP against a running dev server.
 *
 *   accept enquiry -> invite link -> set password -> sign in -> load portal
 *   -> mark attendance -> tenant isolation holds -> sign out
 *
 * Unlike testFlow.ts (which calls the service layer directly), this exercises the actual
 * routes, cookies and permission checks a browser would hit.
 *
 * Run: npm run test-portal            (defaults to http://localhost:3000)
 *      BASE=http://localhost:3002 npm run test-portal
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { purgeTenant, remove, list, findBy } from '../lib/sheets/erpSheets';

const BASE = process.env.BASE || 'http://localhost:3000';

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`  [ok]   ${label}`);
  } else {
    fail++;
    console.log(`  [FAIL] ${label}${detail ? `\n         ${detail}` : ''}`);
  }
}

/** Minimal cookie jar — the real flow depends on httpOnly cookies. */
class Jar {
  private jar = new Map<string, string>();

  capture(res: Response) {
    // getSetCookie is the only way to see multiple Set-Cookie headers.
    const raw = (res.headers as any).getSetCookie?.() ?? [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  has(name: string): boolean {
    return !!this.jar.get(name);
  }

  clear() {
    this.jar.clear();
  }
}

async function req(
  method: string,
  path: string,
  opts: { jar?: Jar; body?: unknown } = {}
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (opts.jar) {
    const c = opts.jar.header();
    if (c) headers.Cookie = c;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });
  opts.jar?.capture(res);

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* some responses have no body */
  }
  return { status: res.status, json };
}

const TENANT_TABS = [
  'users', 'roles', 'role_grants', 'user_roles', 'positions',
  'org_units', 'attendance', 'audit', 'branding', 'module_features', 'capabilities',
] as const;

async function main() {
  console.log(`\n=== Tenant portal auth chain (${BASE}) ===\n`);

  // Reachability first, so a dead server does not look like 20 logic failures.
  try {
    await fetch(`${BASE}/login`, { method: 'HEAD' });
  } catch {
    console.error(`Cannot reach ${BASE}. Start the dev server, or pass BASE=http://localhost:PORT`);
    process.exit(1);
  }

  const admin = new Jar();
  const tenant = new Jar();
  let enquiryId = '';
  let tenantId = '';
  let slug = '';

  try {
    // ── 1. superadmin logs in ──
    console.log('1. Superadmin signs in');
    const login = await req('POST', '/api/auth/login', {
      jar: admin,
      body: { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD },
    });
    check('superadmin login succeeds', login.status === 200, `status ${login.status}`);
    check('superadmin cookie set', admin.has('erp_auth_token'));

    // ── 2. public enquiry ──
    console.log('\n2. Visitor submits an enquiry');
    const enq = await req('POST', '/api/enquiries', {
      body: {
        templateId: 'institution',
        orgName: 'Portaltest Academy',
        contactName: 'Meera Iyer',
        contactEmail: 'meera@portaltest.example',
        message: 'Testing the portal.',
      },
    });
    check('enquiry accepted without auth', enq.status === 201, `status ${enq.status}`);
    enquiryId = enq.json?.id;
    check('enquiry id returned', !!enquiryId);

    // ── 3. accept -> provision -> invite link ──
    console.log('\n3. Superadmin accepts, provisioning the tenant');
    const accept = await req('PATCH', `/api/enquiries/${enquiryId}`, {
      jar: admin,
      body: { action: 'ACCEPT' },
    });
    check('accept succeeds', accept.status === 200, JSON.stringify(accept.json).slice(0, 200));
    tenantId = accept.json?.tenantId;
    slug = accept.json?.slug;
    check('tenant id returned', !!tenantId);
    check('slug returned', !!slug, slug);
    check('invite url returned', typeof accept.json?.inviteUrl === 'string', accept.json?.inviteUrl);
    check('login url returned', accept.json?.loginUrl === `/portal/${slug}/login`, accept.json?.loginUrl);

    const inviteToken = new URL(accept.json.inviteUrl).searchParams.get('token')!;
    check('invite url carries a token', !!inviteToken);

    // ── 4. cannot sign in before accepting the invite ──
    console.log('\n4. Login is refused before the invite is accepted');
    const early = await req('POST', '/api/tenant-auth/login', {
      body: { tenantSlug: slug, email: 'meera@portaltest.example', password: 'anything123' },
    });
    check('login rejected with 401', early.status === 401, `status ${early.status}`);
    check('message explains the invite is unused', /not set up yet|invite/i.test(early.json?.error || ''), early.json?.error);

    // ── 5. invite lookup ──
    console.log('\n5. Invite link identifies the account');
    const peek = await req('GET', `/api/tenant-auth/accept-invite?token=${encodeURIComponent(inviteToken)}`);
    check('invite resolves', peek.status === 200, `status ${peek.status}`);
    check('shows the invited email', peek.json?.email === 'meera@portaltest.example', peek.json?.email);
    check('shows the organisation', peek.json?.orgName === 'Portaltest Academy', peek.json?.orgName);

    // ── 6. password rules ──
    console.log('\n6. Password rules');
    const short = await req('POST', '/api/tenant-auth/accept-invite', {
      body: { token: inviteToken, password: 'abc' },
    });
    check('short password rejected', short.status === 400, `status ${short.status}`);

    const badToken = await req('POST', '/api/tenant-auth/accept-invite', {
      body: { token: 'not-a-real-token', password: 'ValidPass123' },
    });
    check('forged token rejected', badToken.status === 400, `status ${badToken.status}`);

    // ── 7. accept the invite ──
    console.log('\n7. Setting the password');
    const setPw = await req('POST', '/api/tenant-auth/accept-invite', {
      body: { token: inviteToken, password: 'PortalTest123' },
    });
    check('password set', setPw.status === 200, JSON.stringify(setPw.json).slice(0, 200));
    check('points at the tenant login', setPw.json?.loginUrl === `/portal/${slug}/login`, setPw.json?.loginUrl);

    const userAfter = await findBy<any>('users', 'email', 'meera@portaltest.example', tenantId);
    check('status flipped to ACTIVE', userAfter?.status === 'ACTIVE', userAfter?.status);
    check('password stored as a bcrypt hash', /^\$2[aby]\$/.test(userAfter?.passwordHash || ''), (userAfter?.passwordHash || '').slice(0, 7));
    check('plaintext password never stored', !String(userAfter?.passwordHash).includes('PortalTest123'));

    // Replay must fail — a leaked invite cannot take over an active account.
    const replay = await req('POST', '/api/tenant-auth/accept-invite', {
      body: { token: inviteToken, password: 'Hijacked123' },
    });
    check('invite cannot be reused', replay.status === 400, `status ${replay.status}`);

    // ── 8. sign in ──
    console.log('\n8. Tenant user signs in');
    const wrongPw = await req('POST', '/api/tenant-auth/login', {
      body: { tenantSlug: slug, email: 'meera@portaltest.example', password: 'WrongPass123' },
    });
    check('wrong password rejected', wrongPw.status === 401);

    const unknown = await req('POST', '/api/tenant-auth/login', {
      body: { tenantSlug: slug, email: 'nobody@nowhere.example', password: 'WrongPass123' },
    });
    check('unknown email gives the same message (no enumeration)',
      unknown.json?.error === wrongPw.json?.error,
      `${unknown.json?.error} vs ${wrongPw.json?.error}`);

    const good = await req('POST', '/api/tenant-auth/login', {
      jar: tenant,
      body: { tenantSlug: slug, email: 'meera@portaltest.example', password: 'PortalTest123' },
    });
    check('correct password accepted', good.status === 200, JSON.stringify(good.json).slice(0, 200));
    check('tenant cookie set', tenant.has('erp_tenant_token'));
    check('capabilities returned', Array.isArray(good.json?.capabilities) && good.json.capabilities.length > 0,
      `got ${good.json?.capabilities?.length}`);
    check('admin holds people.role.assign', good.json?.capabilities?.includes('people.role.assign'));

    // ── 9. portal data ──
    console.log('\n9. Portal loads the tenant');
    const anon = await req('GET', `/api/portal/${slug}`);
    check('portal refuses an anonymous request', anon.status === 401, `status ${anon.status}`);

    const portal = await req('GET', `/api/portal/${slug}`, { jar: tenant });
    check('portal loads with a session', portal.status === 200, `status ${portal.status}`);
    check('11 people returned', portal.json?.people?.length === 11, `got ${portal.json?.people?.length}`);
    check('8 roles returned', portal.json?.roles?.length === 8, `got ${portal.json?.roles?.length}`);
    check('every person has a resolved role title',
      portal.json?.people?.every((p: any) => !!p.roleTitle),
      JSON.stringify(portal.json?.people?.filter((p: any) => !p.roleTitle)?.slice(0, 2)));
    check('reporting lines present', portal.json?.people?.some((p: any) => p.reportsToUserId));
    check('branding returned', !!portal.json?.branding?.primaryColor, JSON.stringify(portal.json?.branding));

    // ── 10. tenant isolation ──
    console.log('\n10. A session is confined to its own tenant');
    const otherSlug = `${slug}-not-mine`;
    const cross = await req('GET', `/api/portal/${otherSlug}`, { jar: tenant });
    check('same session refused for another slug', cross.status === 401, `status ${cross.status}`);

    const sessionWrong = await req('GET', `/api/tenant-auth/session?slug=${otherSlug}`, { jar: tenant });
    check('session check refuses a foreign slug', sessionWrong.status === 401, `status ${sessionWrong.status}`);

    const sessionRight = await req('GET', `/api/tenant-auth/session?slug=${slug}`, { jar: tenant });
    check('session check passes for its own slug', sessionRight.status === 200);

    // A tenant session must not reach superadmin endpoints.
    const escalate = await req('GET', '/api/enquiries', { jar: tenant });
    check('tenant session cannot list enquiries', escalate.status === 401, `status ${escalate.status}`);

    // ── 11. attendance through the portal ──
    console.log('\n11. Marking attendance as the tenant admin');
    const me = portal.json.me.id;
    const someoneElse = portal.json.people.find((p: any) => p.id !== me)?.id;

    const markSelf = await req('POST', '/api/attendance', {
      jar: tenant,
      body: { tenantId, userId: me, date: '2026-07-26', status: 'PRESENT', actorId: me },
    });
    check('admin marks themselves', markSelf.status === 201, JSON.stringify(markSelf.json).slice(0, 160));

    const markOther = await req('POST', '/api/attendance', {
      jar: tenant,
      body: { tenantId, userId: someoneElse, date: '2026-07-26', status: 'LATE', actorId: me },
    });
    check('admin marks someone else', markOther.status === 201, JSON.stringify(markOther.json).slice(0, 160));

    const amend = await req('POST', '/api/attendance', {
      jar: tenant,
      body: { tenantId, userId: someoneElse, date: '2026-07-26', status: 'PRESENT', actorId: me },
    });
    check('re-marking amends rather than duplicating', amend.json?.amended === true, JSON.stringify(amend.json));

    const rows = await list<any>('attendance', tenantId);
    check('exactly 2 attendance rows exist', rows.length === 2, `got ${rows.length}`);

    const attRead = await req('GET', `/api/attendance?tenantId=${tenantId}&date=2026-07-26`, { jar: tenant });
    check('attendance readable via the portal session', attRead.status === 200, `status ${attRead.status}`);
    check('summary tallies', attRead.json?.summary?.marked === 2, JSON.stringify(attRead.json?.summary));

    const attAnon = await req('GET', `/api/attendance?tenantId=${tenantId}&date=2026-07-26`);
    check('attendance refuses anonymous reads', attAnon.status === 401, `status ${attAnon.status}`);

    // ── 12. a junior role is genuinely restricted ──
    console.log('\n12. A student cannot mark other people');
    const student = portal.json.people.find((p: any) => p.roleTitle === 'Student');
    check('found a Student', !!student, JSON.stringify(portal.json.people.map((p: any) => p.roleTitle)));
    if (student) {
      const denied = await req('POST', '/api/attendance', {
        jar: tenant,
        body: { tenantId, userId: me, date: '2026-07-25', status: 'PRESENT', actorId: student.id },
      });
      check('student marking someone else is refused (403)', denied.status === 403, `status ${denied.status}`);
      check('the refusal names the missing capability', /attendance\.other/.test(denied.json?.capability || ''), denied.json?.capability);
    }


    // ── 12b. writing people from inside the portal ──
    console.log('\n12b. Adding, editing and archiving people');

    const teacherRole = portal.json.roles.find((r: any) => r.title === 'Faculty')
      || portal.json.roles.find((r: any) => r.title === 'Student');

    const created = await req('POST', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: {
        name: "Nadia O'Sullivan",
        code: 'NEW001',
        email: 'nadia@portaltest.example',
        roleId: teacherRole.id,
        reportsToUserId: me,
      },
    });
    check('admin can add a person', created.status === 201, JSON.stringify(created.json).slice(0, 200));
    const newUserId = created.json?.id;
    check('an invite link comes back for them', typeof created.json?.inviteUrl === 'string');

    // Duplicate code must be refused, or two people become indistinguishable in exports.
    const dupe = await req('POST', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: { name: 'Someone Else', code: 'NEW001', roleId: teacherRole.id },
    });
    check('duplicate code refused (409)', dupe.status === 409, `status ${dupe.status}`);

    const noRole = await req('POST', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: { name: 'No Role Person', code: 'NEW002' },
    });
    check('a person without a role is refused', noRole.status === 400, `status ${noRole.status}`);

    // Apostrophe must survive the Sheets round trip untouched.
    const afterAdd = await req('GET', `/api/portal/${slug}`, { jar: tenant });
    const nadia = afterAdd.json.people.find((x: any) => x.id === newUserId);
    check('new person appears in the directory', !!nadia);
    check('apostrophe in the name survives', nadia?.name === "Nadia O'Sullivan", nadia?.name);
    check('new person starts INVITED', nadia?.status === 'INVITED', nadia?.status);
    check('role resolved on read', !!nadia?.roleTitle, nadia?.roleTitle);
    check('placed under the admin', nadia?.reportsToUserId === me, nadia?.reportsToUserId);

    // ── edit + role change ──
    const seniorRole = portal.json.roles.find((r: any) => r.title === 'Vice Principal')
      || portal.json.roles.find((r: any) => r.id !== teacherRole.id);

    const edited = await req('PATCH', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: { userId: newUserId, name: 'Nadia Sullivan', phone: '+91 90000 11111', roleId: seniorRole.id },
    });
    check('admin can edit a person', edited.status === 200, JSON.stringify(edited.json).slice(0, 160));

    const afterEdit = await req('GET', `/api/portal/${slug}`, { jar: tenant });
    const nadia2 = afterEdit.json.people.find((x: any) => x.id === newUserId);
    check('name change persisted', nadia2?.name === 'Nadia Sullivan', nadia2?.name);
    check('role change persisted', nadia2?.roleId === seniorRole.id, nadia2?.roleTitle);

    // The old assignment must be closed, not deleted, so role history survives.
    const assignments = await list<any>('user_roles', tenantId);
    const theirs = assignments.filter((a) => a.userId === newUserId);
    check('two assignment rows exist (history kept)', theirs.length === 2, `got ${theirs.length}`);
    check('exactly one is still open', theirs.filter((a) => !a.validTo).length === 1);
    check('the open one is the new role', theirs.find((a) => !a.validTo)?.roleId === seniorRole.id);

    // ── hierarchy guards ──
    const selfReport = await req('PATCH', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: { userId: newUserId, reportsToUserId: newUserId },
    });
    check('self-report refused', selfReport.status === 400, `status ${selfReport.status}`);

    // me -> reports to nadia, while nadia -> reports to me, would close a loop.
    const loop = await req('PATCH', `/api/portal/${slug}/people`, {
      jar: tenant,
      body: { userId: me, reportsToUserId: newUserId },
    });
    check('reporting loop refused', loop.status === 400, JSON.stringify(loop.json).slice(0, 120));

    // ── archive ──
    const selfArchive = await req('DELETE', `/api/portal/${slug}/people?userId=${me}`, { jar: tenant });
    check('cannot archive your own account', selfArchive.status === 400, `status ${selfArchive.status}`);

    const archived = await req('DELETE', `/api/portal/${slug}/people?userId=${newUserId}`, { jar: tenant });
    check('admin can archive a person', archived.status === 200, JSON.stringify(archived.json).slice(0, 160));

    const afterArchive = await req('GET', `/api/portal/${slug}`, { jar: tenant });
    const nadia3 = afterArchive.json.people.find((x: any) => x.id === newUserId);
    check('archived, not deleted', !!nadia3, 'row disappeared');
    check('status is SUSPENDED', nadia3?.status === 'SUSPENDED', nadia3?.status);

    // ── writes require a session ──
    const anonWrite = await req('POST', `/api/portal/${slug}/people`, {
      body: { name: 'Anonymous', code: 'ANON1', roleId: teacherRole.id },
    });
    check('anonymous write refused', anonWrite.status === 401, `status ${anonWrite.status}`);

    const crossWrite = await req('POST', `/api/portal/${slug}-not-mine/people`, {
      jar: tenant,
      body: { name: 'Cross Tenant', code: 'X1', roleId: teacherRole.id },
    });
    check('write to another tenant refused', crossWrite.status === 401, `status ${crossWrite.status}`);

    // ── 13. sign out ──
    console.log('\n13. Sign out');
    const out = await req('POST', '/api/tenant-auth/session', { jar: tenant });
    check('sign out succeeds', out.status === 200);
    tenant.clear();
    const afterOut = await req('GET', `/api/portal/${slug}`, { jar: tenant });
    check('portal refuses after sign out', afterOut.status === 401, `status ${afterOut.status}`);
  } finally {
    console.log('\n14. Cleanup');
    if (tenantId) {
      const removed = await purgeTenant(tenantId, TENANT_TABS as unknown as any);
      console.log(`   purged ${Object.values(removed).reduce((a, b) => a + b, 0)} rows`);
      await remove('tenants', 'id', tenantId);
    }
    if (enquiryId) await remove('enquiries', 'id', enquiryId);
    check('tenant removed', tenantId ? (await findBy<any>('tenants', 'id', tenantId)) === null : true);
    check('enquiry removed', enquiryId ? (await findBy<any>('enquiries', 'id', enquiryId)) === null : true);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nUnexpected failure:', err?.stack || err);
  process.exit(1);
});
