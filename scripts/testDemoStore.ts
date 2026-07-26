/**
 * Logic tests for the demo sandbox store. Runs in node with a localStorage stub, so the
 * seeding, persistence, capability model and hierarchy guards are verified without a browser.
 *
 * Run: npm run test-demo
 */

// Minimal localStorage stub, installed before importing the store.
const mem = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
};

import {
  buildSeed,
  load,
  save,
  reset,
  importJson,
  exportJson,
  wouldCycle,
  capabilitiesOf,
  can,
  usersInRole,
  reportsOf,
  attendanceSummary,
  CAPABILITY_CATALOGUE,
  type DemoSnapshot,
} from '../lib/demo/demoStore';
import { TEMPLATE_DEMOS } from '../lib/seeds/templateDemos';

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

const TID = 'student-info-system';

console.log('\n=== Demo sandbox store ===\n');

// ── 1. every template seeds without throwing ──
console.log('1. Seeding every template');
const templateIds = Object.keys(TEMPLATE_DEMOS);
let seedFailures: string[] = [];
for (const id of templateIds) {
  try {
    const s = buildSeed(id);
    if (!s.users.length || !s.roles.length) seedFailures.push(`${id} (empty)`);
    // Every user must point at a role that exists — a dangling roleId would render "—".
    const roleIds = new Set(s.roles.map((r) => r.id));
    const orphans = s.users.filter((u) => !roleIds.has(u.roleId));
    if (orphans.length) seedFailures.push(`${id} (${orphans.length} users with unknown role)`);
    // Every reportsToUserId must resolve.
    const userIds = new Set(s.users.map((u) => u.id));
    const badMgr = s.users.filter((u) => u.reportsToUserId && !userIds.has(u.reportsToUserId));
    if (badMgr.length) seedFailures.push(`${id} (${badMgr.length} bad manager refs)`);
  } catch (e) {
    seedFailures.push(`${id} (threw: ${(e as Error).message})`);
  }
}
check(`all ${templateIds.length} templates seed cleanly`, seedFailures.length === 0, seedFailures.join('; '));

// ── 2. seeded content matches the template ──
console.log('\n2. Seed content');
const seed = buildSeed(TID);
const src = (TEMPLATE_DEMOS as any)[TID];
check(`${src.users.length} users seeded`, seed.users.length === src.users.length, `got ${seed.users.length}`);
check(`${src.roles.length} roles seeded`, seed.roles.length === src.roles.length, `got ${seed.roles.length}`);
check('org name carried over', seed.profile.orgName === src.tenant.name, seed.profile.orgName);
check('exactly one root in the tree', seed.users.filter((u) => !u.reportsToUserId).length === 1);
check('attendance starts empty', seed.attendance.length === 0);

// ── 3. capability model is real, not random ──
console.log('\n3. Capability model (previously Math.random)');
const first = capabilitiesOf(seed, seed.users[0].id);
const firstAgain = capabilitiesOf(seed, seed.users[0].id);
check('capability count is stable across reads', first.length === firstAgain.length, `${first.length} vs ${firstAgain.length}`);
check('every capability id is in the catalogue', first.every((c) => CAPABILITY_CATALOGUE.some((d) => d.id === c)));
check('top role holds every capability', first.length === CAPABILITY_CATALOGUE.length, `${first.length}/${CAPABILITY_CATALOGUE.length}`);

const student = seed.users.find((u) => seed.roles.find((r) => r.id === u.roleId)?.name === 'Student');
if (student) {
  const studentCaps = capabilitiesOf(seed, student.id);
  check('junior role holds fewer than the top role', studentCaps.length < first.length, `${studentCaps.length} vs ${first.length}`);
  check('junior role cannot run payroll', !can(seed, student.id, 'payroll.run.execute'));
  check('junior role can mark own attendance', can(seed, student.id, 'attendance.self.mark'));
} else {
  check('found a Student to compare', false, 'no Student role in seed');
}

// ── 4. persistence round trip ──
console.log('\n4. Persistence');
mem.clear();
const fresh = load(TID);
check('load() with empty storage returns a seed', fresh.users.length === src.users.length);

const edited: DemoSnapshot = { ...fresh, profile: { ...fresh.profile, orgName: 'My Renamed School' } };
save(edited);
const reloaded = load(TID);
check('edit survives a reload', reloaded.profile.orgName === 'My Renamed School', reloaded.profile.orgName);
check('storage key is namespaced by template', [...mem.keys()].every((k) => k.includes(TID)), [...mem.keys()].join(', '));

// ── 5. templates are isolated from each other ──
console.log('\n5. Template isolation');
const other = load('patient-management-system');
check('editing one template does not affect another', other.profile.orgName !== 'My Renamed School', other.profile.orgName);
save({ ...other, profile: { ...other.profile, orgName: 'Hospital X' } });
check('first template keeps its own edit', load(TID).profile.orgName === 'My Renamed School');
check('second template keeps its own edit', load('patient-management-system').profile.orgName === 'Hospital X');

// ── 6. reset ──
console.log('\n6. Reset');
const afterReset = reset(TID);
check('reset restores the original name', afterReset.profile.orgName === src.tenant.name, afterReset.profile.orgName);
check('reset clears the stored key', !mem.has([...mem.keys()].find((k) => k.includes(TID)) ?? '__none__'));
check('other template survives the reset', load('patient-management-system').profile.orgName === 'Hospital X');

// ── 7. hierarchy cycle guard ──
console.log('\n7. Hierarchy cycle guard');
const h = buildSeed(TID);
const [a, b, c] = h.users;
check('self-report is rejected', wouldCycle(h, a.id, a.id) === true);
check('reporting to nobody is allowed', wouldCycle(h, b.id, '') === false);
// b already reports to a, so making a report to b closes a 2-cycle.
check('direct 2-cycle is rejected', wouldCycle(h, a.id, b.id) === true);
// Build a->b->c chain, then check c cannot become a's manager.
const chain: DemoSnapshot = {
  ...h,
  users: h.users.map((u) => (u.id === c.id ? { ...u, reportsToUserId: b.id } : u)),
};
check('indirect 3-cycle is rejected', wouldCycle(chain, a.id, c.id) === true);
check('valid re-parent is allowed', wouldCycle(chain, c.id, a.id) === false);

// ── 8. derived helpers ──
console.log('\n8. Derived helpers');
const d = buildSeed(TID);
const hodRole = d.roles.find((r) => r.code === 'HOD');
if (hodRole) {
  const holders = usersInRole(d, hodRole.id);
  check('two people share the HOD role', holders.length === 2, `got ${holders.length}`);
  check('...with different codes', holders[0]?.code !== holders[1]?.code, `${holders[0]?.code} / ${holders[1]?.code}`);
  check('...and identical capabilities', JSON.stringify(capabilitiesOf(d, holders[0].id)) === JSON.stringify(capabilitiesOf(d, holders[1].id)));
} else {
  check('found the HOD role', false);
}
check('root has the rest as direct reports', reportsOf(d, d.users[0].id).length === d.users.length - 1);

// ── 9. attendance summary ──
console.log('\n9. Attendance summary');
const withAtt: DemoSnapshot = {
  ...d,
  attendance: [
    { id: 'a1', userId: d.users[0].id, date: '2026-07-26', status: 'PRESENT', checkIn: '09:00', checkOut: '', note: '' },
    { id: 'a2', userId: d.users[1].id, date: '2026-07-26', status: 'ABSENT', checkIn: '', checkOut: '', note: '' },
    { id: 'a3', userId: d.users[2].id, date: '2026-07-26', status: 'LATE', checkIn: '10:30', checkOut: '', note: '' },
    { id: 'a4', userId: d.users[0].id, date: '2026-07-25', status: 'LEAVE', checkIn: '', checkOut: '', note: '' },
  ],
};
const sum = attendanceSummary(withAtt, '2026-07-26');
check('counts only the requested date', sum.marked === 3, `got ${sum.marked}`);
check('present tallied', sum.present === 1);
check('absent tallied', sum.absent === 1);
check('late tallied', sum.late === 1);
check('other date excluded', sum.leave === 0);
check('total is headcount', sum.total === d.users.length);

// ── 10. export / import ──
console.log('\n10. Export & import');
const json = exportJson(withAtt);
const imported = importJson(TID, json);
check('valid export imports back', imported.ok === true, imported.ok ? '' : imported.error);
if (imported.ok) {
  check('attendance preserved through the round trip', imported.snapshot.attendance.length === 4);
}
const badJson = importJson(TID, '{ not json');
check('malformed JSON is rejected with a message', !badJson.ok && /valid JSON/i.test(badJson.error!), badJson.ok ? 'accepted!' : badJson.error);
const wrongShape = importJson(TID, '{"hello":"world"}');
check('wrong shape is rejected', !wrongShape.ok && /users.*roles/i.test(wrongShape.error!), wrongShape.ok ? 'accepted!' : wrongShape.error);
const wrongTemplate = importJson(TID, JSON.stringify({ ...withAtt, templateId: 'retail-operations-hub' }));
check("another template's export is rejected", !wrongTemplate.ok && /retail-operations-hub/.test(wrongTemplate.error!), wrongTemplate.ok ? 'accepted!' : wrongTemplate.error);

// ── 11. corrupt storage and version bump ──
console.log('\n11. Resilience');
mem.set(`erp-demo:v2:${TID}`, '{{{ corrupt');
check('corrupt JSON falls back to a seed', load(TID).users.length === src.users.length);
mem.set(`erp-demo:v2:${TID}`, JSON.stringify({ version: 1, users: [], roles: [] }));
check('stale version falls back to a seed', load(TID).users.length === src.users.length);

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
