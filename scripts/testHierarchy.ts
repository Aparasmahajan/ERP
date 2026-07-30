/**
 * Dotted-line links and acting delegation, against the real sheet.
 *
 * The school scenario this exists for:
 *   - a teacher reports to an HOD (line authority)
 *   - the same teacher answers to a Class Coordinator for one class (dotted line)
 *   - she teaches three subjects, each with its own subject lead (more dotted lines)
 *   - when she is away, someone above her grants another teacher her powers, and the
 *     cover lapses on its own
 *
 * Run: npm run test-hierarchy
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { list, append, findBy, purgeTenant, remove } from '../lib/sheets/erpSheets';
import { provisionTenant } from '../lib/provisioning/provisionTenant';
import {
  addLink, endLink, linksForTenant, linkedManagers, linkedSubordinates,
  delegateRole, delegateLinks, revokeDelegation, activeDelegations, canDelegateRole,
} from '../lib/hierarchy/links';
import { rolesOf, effectiveCapabilities, visibleUserIds } from '../lib/permissions/can';

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  [ok]   ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}${detail ? `\n         ${detail}` : ''}`); }
}

const TABS = [
  'users', 'roles', 'role_grants', 'user_roles', 'positions', 'position_link',
  'org_units', 'attendance', 'audit', 'branding', 'module_features', 'capabilities',
] as const;

async function main() {
  console.log('\n=== Dotted lines & acting delegation ===\n');

  const prov = await provisionTenant({
    templateId: 'institution',
    orgName: 'Hierarchytest School',
    adminName: 'Head Teacher',
    adminEmail: 'head@hierarchytest.example',
    actorId: 'test',
  });
  const T = prov.tenantId;

  try {
    const users = await list<any>('users', T);
    const roles = await list<any>('roles', T);

    const admin = users.find((u) => u.code === 'ADMIN001');
    const hod = users.find((u) => u.code === 'HOD001');
    const faculty = users.find((u) => u.code === 'FAC001');
    const faculty2 = users.find((u) => u.code === 'FAC002');
    const coordinator = users.find((u) => u.code === 'CC001');
    const student = users.find((u) => u.code === 'STU001');

    check('seeded cast present', !!(admin && hod && faculty && faculty2 && coordinator && student));

    // Give the tree some depth: FAC001 -> HOD001 -> admin
    const positions = await list<any>('positions', T);
    const facPos = positions.find((p) => p.userId === faculty.id);
    const hodPos = positions.find((p) => p.userId === hod.id);
    const { update } = await import('../lib/sheets/erpSheets');
    await update('positions', 'id', facPos.id, { reportsToUserId: hod.id });
    await update('positions', 'id', hodPos.id, { reportsToUserId: admin.id });

    // ── 1. dotted lines ──
    console.log('\n1. Dotted lines');
    const l1 = await addLink({
      tenantId: T, userId: faculty.id, linkedToUserId: coordinator.id,
      kind: 'CLASS_COORDINATOR', subject: 'Class 9A', actorId: admin.id,
    });
    check('class coordinator link added', l1.ok === true, (l1 as any).error);

    // A teacher teaching several subjects gets one link per subject.
    for (const subj of ['Mathematics', 'Physics', 'Chemistry']) {
      const r = await addLink({
        tenantId: T, userId: faculty.id, linkedToUserId: hod.id,
        kind: 'SUBJECT_LEAD', subject: subj, actorId: admin.id,
      });
      check(`subject link (${subj})`, r.ok === true, (r as any).error);
    }

    const mgrs = await linkedManagers(T, faculty.id);
    check('4 dotted managers recorded', mgrs.length === 4, `got ${mgrs.length}`);
    check('subjects preserved per link',
      ['Mathematics', 'Physics', 'Chemistry'].every((s) => mgrs.some((m) => m.subject === s)));

    const dupe = await addLink({
      tenantId: T, userId: faculty.id, linkedToUserId: coordinator.id,
      kind: 'CLASS_COORDINATOR', subject: 'Class 9A', actorId: admin.id,
    });
    check('identical link rejected', dupe.ok === false, JSON.stringify(dupe));

    const self = await addLink({
      tenantId: T, userId: faculty.id, linkedToUserId: faculty.id,
      kind: 'MENTOR', actorId: admin.id,
    });
    check('self-link rejected', self.ok === false);

    const badKind = await addLink({
      tenantId: T, userId: faculty.id, linkedToUserId: hod.id,
      kind: 'SUPREME_OVERLORD', actorId: admin.id,
    });
    check('unknown link kind rejected', badKind.ok === false);

    // ── 2. visibility vs authority ──
    console.log('\n2. A dotted line grants visibility, never authority');
    const coordView = await visibleUserIds(T, coordinator.id);
    check('coordinator sees the teacher via link', coordView.link.includes(faculty.id));
    check('...and NOT through the reporting tree', !coordView.tree.includes(faculty.id));

    const hodView = await visibleUserIds(T, hod.id);
    check('HOD sees the teacher through the tree', hodView.tree.includes(faculty.id));

    // The critical guarantee: the dotted line must not let the coordinator hand out
    // the teacher's authority. Only the line manager may.
    check('coordinator CANNOT delegate the teacher (not an ancestor)',
      (await canDelegateRole(T, coordinator.id, faculty.id)) === false);
    check('HOD CAN delegate the teacher (direct manager)',
      (await canDelegateRole(T, hod.id, faculty.id)) === true);
    check('admin CAN delegate the teacher (indirect ancestor)',
      (await canDelegateRole(T, admin.id, faculty.id)) === true);
    check('teacher cannot delegate herself',
      (await canDelegateRole(T, faculty.id, faculty.id)) === false);
    check('nobody can delegate upwards',
      (await canDelegateRole(T, faculty.id, hod.id)) === false);

    // ── 3. acting delegation ──
    console.log('\n3. Acting cover while the class teacher is away');
    const before = await rolesOf(T, faculty2.id);

    const wrongActor = await delegateRole({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id,
      until: new Date(Date.now() + 864e5 * 7).toISOString(), actorId: coordinator.id,
    });
    check('a peer cannot grant the cover', wrongActor.ok === false, (wrongActor as any).error);
    check('...and the message explains why',
      /above this person/.test((wrongActor as any).error || ''), (wrongActor as any).error);

    const noEnd = await delegateRole({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id, until: '', actorId: hod.id,
    });
    check('open-ended cover rejected', noEnd.ok === false, (noEnd as any).error);

    const past = await delegateRole({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id,
      until: '2020-01-01T00:00:00.000Z', actorId: hod.id,
    });
    check('back-dated cover rejected', past.ok === false);

    const until = new Date(Date.now() + 864e5 * 7).toISOString();

    // Two Faculty share one role, so there is no role to hand over. The error should
    // say so and point at assignment cover instead of failing opaquely.
    const sameRole = await delegateRole({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id, until, actorId: hod.id,
    });
    check('same-role delegation refused', sameRole.ok === false);
    check('...and suggests covering assignments instead',
      /assignments instead/.test((sameRole as any).error || ''), (sameRole as any).error);

    // A genuine role delegation: the HOD's role handed down to a teacher.
    const ok = await delegateRole({
      tenantId: T, fromUserId: hod.id, toUserId: faculty.id, until, actorId: admin.id,
      reason: 'HOD on leave',
    });
    check('admin delegates the HOD role downward', ok.ok === true, (ok as any).error);

    const hodRole = (await rolesOf(T, hod.id))[0];
    check('teacher now holds the HOD role', (await rolesOf(T, faculty.id)).includes(hodRole));

    const capsAfter = await effectiveCapabilities(T, faculty.id);
    check('capabilities widened by the delegated role', capsAfter.length > 0, `got ${capsAfter.length}`);

    const dels = await activeDelegations(T);
    check('delegation listed as active', dels.some((d) => d.userId === faculty.id));
    check('...and carries its end date', dels.find((d) => d.userId === faculty.id)?.until === until);

    const twice = await delegateRole({
      tenantId: T, fromUserId: hod.id, toUserId: faculty.id, until, actorId: admin.id,
    });
    check('duplicate cover rejected', twice.ok === false, (twice as any).error);

    // ── 3b. covering assignments, which is the real school case ──
    console.log('\n3b. Covering a class teacher\'s assignments');

    // faculty is CLASS_COORDINATOR-linked? No - coordinator is. Give faculty an
    // assignment of her own so there is something to cover.
    await addLink({
      tenantId: T, userId: student.id, linkedToUserId: faculty.id,
      kind: 'CLASS_COORDINATOR', subject: 'Class 9A', actorId: admin.id,
    });

    const peerCover = await delegateLinks({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id, until, actorId: coordinator.id,
    });
    check('a peer cannot grant assignment cover', peerCover.ok === false, (peerCover as any).error);

    const cover = await delegateLinks({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id, until, actorId: hod.id,
      reason: 'Class teacher away',
    });
    check('HOD grants assignment cover', cover.ok === true, (cover as any).error);
    check('at least one assignment copied', cover.ok && (cover as any).copied >= 1);

    const stand = await linkedSubordinates(T, faculty2.id);
    check('stand-in can now see the class', stand.includes(student.id));
    const original = await linkedSubordinates(T, faculty.id);
    check('original keeps her own assignment', original.includes(student.id));

    const coverAgain = await delegateLinks({
      tenantId: T, fromUserId: faculty.id, toUserId: faculty2.id, until, actorId: hod.id,
    });
    check('duplicate assignment cover rejected', coverAgain.ok === false, (coverAgain as any).error);

    // Cover must not create authority.
    check('stand-in still cannot delegate her',
      (await canDelegateRole(T, faculty2.id, faculty.id)) === false);

    // ── 4. expiry needs no cleanup job ──
    console.log('\n4. Cover lapses on its own');
    const expiring = await delegateRole({
      tenantId: T, fromUserId: hod.id, toUserId: student.id,
      until: new Date(Date.now() + 2000).toISOString(), actorId: admin.id,
    });
    check('short cover granted', expiring.ok === true, (expiring as any).error);
    check('in force now', (await rolesOf(T, student.id)).length > 0);

    // Rather than sleeping, back-date validTo and confirm rolesOf stops counting it.
    if (expiring.ok) {
      const { update: upd } = await import('../lib/sheets/erpSheets');
      await upd('user_roles', 'id', expiring.ids[0], { validTo: '2020-01-01T00:00:00.000Z' });
      const stillActive = (await activeDelegations(T)).some((d) => d.id === expiring.ids[0]);
      check('expired cover no longer active', !stillActive);
      check('expired role no longer granted to them',
        !(await rolesOf(T, student.id)).includes(expiring.ids[0]));
    }

    // ── 5. revoking early ──
    console.log('\n5. Ending cover early');
    const target = (await activeDelegations(T)).find((d) => d.userId === faculty.id);
    const rev = await revokeDelegation(T, target!.id, hod.id);
    check('cover revoked', rev.ok === true, rev.error);
    check('no longer active', !(await activeDelegations(T)).some((d) => d.id === target!.id));

    const subRole = (await list<any>('user_roles', T)).find(
      (a) => a.userId === faculty.id && String(a.isActing) !== 'true'
    );
    const revSub = await revokeDelegation(T, subRole.id, hod.id);
    check('a substantive role cannot be revoked as if it were cover', revSub.ok === false, revSub.error);

    // ── 6. ending a dotted line keeps history ──
    console.log('\n6. Ending a dotted line');
    const links = await linksForTenant(T);
    const n0 = links.length;
    await endLink(T, links[0].id, admin.id);
    check('link no longer live', (await linksForTenant(T)).length === n0 - 1);
    check('row retained for audit', (await list<any>('position_link', T)).length === n0);
  } finally {
    console.log('\n7. Cleanup');
    const removed = await purgeTenant(T, TABS as unknown as any);
    console.log(`   purged ${Object.values(removed).reduce((a, b) => a + b, 0)} rows`);
    await remove('tenants', 'id', T);
    check('tenant removed', (await findBy<any>('tenants', 'id', T)) === null);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nUnexpected failure:', e?.stack || e); process.exit(1); });
