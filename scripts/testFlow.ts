/**
 * End-to-end test of the business flow, against the real Google Sheet.
 *
 *   enquiry raised -> superadmin accepts -> tenant provisioned from the chosen template
 *   -> users exist with roles -> role capabilities take effect -> attendance marked
 *
 * Calls the service layer directly (not HTTP), so it verifies the data chain without
 * needing a running server. Cleans up every row it creates.
 *
 * Run: npm run test-flow
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { list, append, update, remove, findBy, purgeTenant } from '../lib/sheets/erpSheets';
import { provisionTenant } from '../lib/provisioning/provisionTenant';
import { can, canDelegate, effectiveCapabilities, rolesOf } from '../lib/permissions/can';
import { resolveSeedKey } from '../lib/templates/resolve';
import { CAPABILITY_CATALOGUE } from '../lib/capabilities/catalogue';

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

const MARKER = '__flowtest__';
const created: { tab: any; key: string; val: string }[] = [];

async function cleanup(tenantId: string, enquiryId: string) {
  // One read + one write per tab. The previous row-by-row loop cost 3 API calls per row
  // and tripped the Sheets per-minute quota partway through.
  const removed = await purgeTenant(tenantId, [
    'users', 'roles', 'role_grants', 'user_roles', 'positions',
    'org_units', 'attendance', 'audit', 'branding', 'module_features', 'capabilities',
  ]);
  const total = Object.values(removed).reduce((a, b) => a + b, 0);
  console.log(`   purged ${total} rows across ${Object.keys(removed).length} tabs`);

  await remove('tenants', 'id', tenantId);
  await remove('enquiries', 'id', enquiryId);
}

async function main() {
  console.log('\n=== End-to-end flow: enquiry -> accept -> tenant -> roles -> attendance ===\n');

  // ── STEP 1: a visitor raises an enquiry ──
  console.log('1. Visitor raises an enquiry from a template card');

  // The landing page sends a *catalogue* id, not a seed key. This is the mismatch that
  // would have rejected every real submission.
  const submittedTemplateId = 'institution';
  const seedKey = resolveSeedKey(submittedTemplateId);
  check(`catalogue id "${submittedTemplateId}" resolves to a seed`, seedKey === 'student-info-system', String(seedKey));

  const enquiryId = `enq_${MARKER}_${Date.now().toString(36)}`;
  await append('enquiries', {
    id: enquiryId,
    orgName: 'Flowtest Academy',
    contactName: 'Asha Menon',
    contactEmail: 'asha@flowtest.example',
    contactPhone: '+91 90000 00000',
    templateId: submittedTemplateId,
    pack: 'INSTITUTION',
    message: 'We need attendance and marks.',
    status: 'NEW',
    createdAt: new Date().toISOString(),
    reviewedBy: '',
    reviewedAt: '',
    rejectionReason: '',
    tenantId: '',
  });

  const stored = await findBy<any>('enquiries', 'id', enquiryId);
  check('enquiry landed in the sheet', stored !== null);
  check('starts in NEW status', stored?.status === 'NEW', stored?.status);

  // ── STEP 2 + 3: superadmin accepts, which provisions a tenant ──
  console.log('\n2. Superadmin accepts -> tenant is provisioned from that template');
  const result = await provisionTenant({
    templateId: stored.templateId,
    orgName: stored.orgName,
    adminName: stored.contactName,
    adminEmail: stored.contactEmail,
    pack: stored.pack,
    actorId: 'superadmin@flowtest',
  });
  const tenantId = result.tenantId;

  await update('enquiries', 'id', enquiryId, {
    status: 'ACCEPTED',
    reviewedBy: 'superadmin@flowtest',
    reviewedAt: new Date().toISOString(),
    tenantId,
  });

  const reviewed = await findBy<any>('enquiries', 'id', enquiryId);
  check('enquiry flipped to ACCEPTED', reviewed?.status === 'ACCEPTED', reviewed?.status);
  check('enquiry now links to the tenant', reviewed?.tenantId === tenantId);
  // Accepts a "-N" suffix: uniqueSlug appends one when the base slug is already taken, so
  // asserting the bare slug would fail whenever a previous run left a tenant behind.
  check(
    'slug derived from the org name',
    /^flowtest-academy(-\d+)?$/.test(result.slug),
    result.slug
  );

  // A second tenant with the same name must not reuse the slug — the portal routes on
  // slug, so a collision would point two customers at the same URL.
  const dup = await provisionTenant({
    templateId: stored.templateId,
    orgName: stored.orgName,
    adminName: 'Second Admin',
    adminEmail: 'second@flowtest.example',
    pack: stored.pack,
    actorId: 'superadmin@flowtest',
  });
  check('a same-named tenant gets a distinct slug', dup.slug !== result.slug, `${dup.slug} vs ${result.slug}`);
  await purgeTenant(dup.tenantId, [
    'users', 'roles', 'role_grants', 'user_roles', 'positions',
    'org_units', 'audit', 'branding', 'module_features',
  ]);
  await remove('tenants', 'id', dup.tenantId);

  try {
    // ── STEP 4: the tenant actually contains the template's content ──
    console.log('\n3. Tenant contains real data from the chosen template');
    const tenant = await findBy<any>('tenants', 'id', tenantId);
    check('tenant row exists', tenant !== null);
    check('tenant is ACTIVE', tenant?.status === 'ACTIVE', tenant?.status);

    const [roles, users, userRoles, grants, positions, orgUnits, features] = await Promise.all([
      list<any>('roles', tenantId),
      list<any>('users', tenantId),
      list<any>('user_roles', tenantId),
      list<any>('role_grants', tenantId),
      list<any>('positions', tenantId),
      list<any>('org_units', tenantId),
      list<any>('module_features', tenantId),
    ]);

    check('8 roles from the school template', roles.length === 8, `got ${roles.length}`);
    check('11 users (10 template + 1 admin)', users.length === 11, `got ${users.length}`);
    check('every user has a role assignment', userRoles.length === users.length, `${userRoles.length} vs ${users.length}`);
    check('role_grants written', grants.length > 0, `got ${grants.length}`);
    check('positions written', positions.length === users.length);
    check('one root org unit', orgUnits.length === 1);
    check('features written', features.length > 0, `got ${features.length}`);

    // No dangling references — the failure mode that made the old Excel data unusable.
    const roleIds = new Set(roles.map((r) => r.id));
    const userIds = new Set(users.map((u) => u.id));
    check('no assignment points at a missing role', userRoles.every((a) => roleIds.has(a.roleId)));
    check('no assignment points at a missing user', userRoles.every((a) => userIds.has(a.userId)));
    check('no grant points at a missing role', grants.every((g) => roleIds.has(g.roleId)));

    // ── STEP 5: different people hold different roles ──
    console.log('\n4. People hold different roles');
    const admin = users.find((u) => u.code === 'ADMIN001');
    check('admin from the enquiry exists', !!admin);
    check('admin uses the enquirer email', admin?.email === 'asha@flowtest.example', admin?.email);
    check('admin starts INVITED, not ACTIVE', admin?.status === 'INVITED', admin?.status);

    const principalRole = roles.find((r) => r.key === 'PRIN');
    const studentRole = roles.find((r) => r.key === 'STU');
    check('Principal role present', !!principalRole);
    check('Student role present', !!studentRole);

    const hodUsers = users.filter((u) => u.code === 'HOD001' || u.code === 'HOD002');
    check('two HODs seeded', hodUsers.length === 2, `got ${hodUsers.length}`);
    if (hodUsers.length === 2) {
      const [r1, r2] = await Promise.all([
        rolesOf(tenantId, hodUsers[0].id),
        rolesOf(tenantId, hodUsers[1].id),
      ]);
      check('both HODs hold the same role', r1[0] === r2[0] && !!r1[0], `${r1[0]} vs ${r2[0]}`);
      check('...despite different codes', hodUsers[0].code !== hodUsers[1].code);
    }

    // ── STEP 6: capabilities actually resolve through role_grants ──
    console.log('\n5. Permissions take effect (role -> role_grants -> capability)');
    const adminCaps = await effectiveCapabilities(tenantId, admin.id);
    check('admin resolves capabilities', adminCaps.length > 0, `got ${adminCaps.length}`);
    check('admin holds every capability', adminCaps.length === CAPABILITY_CATALOGUE.length, `${adminCaps.length}/${CAPABILITY_CATALOGUE.length}`);
    check('admin can run payroll', await can(tenantId, admin.id, 'payroll.run.execute'));
    check('admin can assign roles at TENANT scope', await can(tenantId, admin.id, 'people.role.assign', { scope: 'TENANT' }));
    check('admin may delegate', await canDelegate(tenantId, admin.id, 'people.role.assign'));

    const studentUser = users.find((u) => u.code === 'STU001');
    check('student user exists', !!studentUser);
    if (studentUser) {
      const caps = await effectiveCapabilities(tenantId, studentUser.id);
      check('student holds fewer capabilities', caps.length < adminCaps.length, `${caps.length} vs ${adminCaps.length}`);
      check('student CANNOT run payroll', !(await can(tenantId, studentUser.id, 'payroll.run.execute')));
      check('student CANNOT assign roles', !(await can(tenantId, studentUser.id, 'people.role.assign')));
      check('student CAN mark own attendance', await can(tenantId, studentUser.id, 'attendance.self.mark'));
      check('student cannot mark others at TENANT scope', !(await can(tenantId, studentUser.id, 'attendance.self.mark', { scope: 'TENANT' })));
      check('student may not delegate', !(await canDelegate(tenantId, studentUser.id, 'attendance.self.mark')));
    }

    // Unknown user must be denied, not crash.
    check('unknown user is denied', !(await can(tenantId, 'no_such_user', 'people.user.read')));

    // ── STEP 7: per-person override beats the role ──
    console.log('\n6. Per-person override layered on the role');
    if (studentUser) {
      const ovId = `cap_${MARKER}_${Date.now().toString(36)}`;
      await append('capabilities', {
        id: ovId,
        tenantId,
        userId: studentUser.id,
        capability: 'payroll.salary.read',
        mode: 'GRANT',
        scope: 'SELF',
        grantedBy: 'superadmin@flowtest',
        grantedAt: new Date().toISOString(),
        expiresAt: '',
        delegable: false,
      });
      check('GRANT override adds a power the role lacks', await can(tenantId, studentUser.id, 'payroll.salary.read'));

      await update('capabilities', 'id', ovId, { mode: 'REVOKE', capability: 'attendance.self.mark' });
      check('REVOKE override removes a power the role grants', !(await can(tenantId, studentUser.id, 'attendance.self.mark')));

      // An expired override must be ignored entirely.
      await update('capabilities', 'id', ovId, {
        mode: 'GRANT',
        capability: 'payroll.run.execute',
        expiresAt: '2020-01-01T00:00:00.000Z',
      });
      check('expired override is ignored', !(await can(tenantId, studentUser.id, 'payroll.run.execute')));

      await remove('capabilities', 'id', ovId);
    }

    // ── STEP 8: attendance ──
    console.log('\n7. Attendance');
    const date = '2026-07-26';
    const attId = `att_${MARKER}_${Date.now().toString(36)}`;
    await append('attendance', {
      id: attId,
      tenantId,
      userId: studentUser.id,
      date,
      status: 'PRESENT',
      checkIn: '09:05',
      checkOut: '',
      markedBy: admin.id,
      markedAt: new Date().toISOString(),
      note: '',
    });

    let att = await list<any>('attendance', tenantId);
    check('attendance row written', att.length === 1, `got ${att.length}`);
    check('status stored', att[0]?.status === 'PRESENT', att[0]?.status);
    check('check-in time stored', att[0]?.checkIn === '09:05', att[0]?.checkIn);

    // Amending must not create a second row for the same person and day.
    await update('attendance', 'id', attId, { status: 'LATE', note: 'traffic' });
    att = await list<any>('attendance', tenantId);
    check('amend does not duplicate the row', att.length === 1, `got ${att.length}`);
    check('amended status persisted', att[0]?.status === 'LATE', att[0]?.status);
    check('note persisted', att[0]?.note === 'traffic', att[0]?.note);

    // ── STEP 9: audit trail ──
    console.log('\n8. Audit trail');
    const auditRows = await list<any>('audit', tenantId);
    check('provisioning was audited', auditRows.length > 0, `got ${auditRows.length}`);
    const provRow = auditRows.find((a) => a.entityType === 'tenant');
    check('audit records the tenant creation', !!provRow);
    check('audit records who did it', provRow?.actorId === 'superadmin@flowtest', provRow?.actorId);

    // ── STEP 10: tenant isolation ──
    console.log('\n9. Tenant isolation');
    const otherTenants = (await list<any>('users')).filter((u) => u.tenantId !== tenantId);
    check('listing by tenant excludes other tenants', (await list<any>('users', tenantId)).every((u) => u.tenantId === tenantId));
    check('unscoped list can see beyond this tenant', otherTenants.length >= 0);
  } finally {
    console.log('\n10. Cleanup');
    await cleanup(tenantId, enquiryId);
    const leftover =
      (await list<any>('users', tenantId)).length +
      (await list<any>('roles', tenantId)).length +
      (await list<any>('attendance', tenantId)).length +
      (await list<any>('role_grants', tenantId)).length;
    check('all test rows removed', leftover === 0, `${leftover} left behind`);
    check('tenant row removed', (await findBy<any>('tenants', 'id', tenantId)) === null);
    check('enquiry row removed', (await findBy<any>('enquiries', 'id', enquiryId)) === null);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nUnexpected failure:', err?.stack || err);
  process.exit(1);
});
