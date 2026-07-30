/**
 * Round-trip test for the Google Sheets adapter.
 *
 * Proves the two defects that made the Excel adapter unusable are gone:
 *   1. keys survive a write -> read round trip unchanged (Excel camelCased on read and
 *      Title Cased on write, so `user_id` never came back as the type layer expected)
 *   2. update() replaces a row instead of duplicating the sheet (Excel's
 *      spliceRows(2, rowCount-1) was off by one and deleted nothing, so four writes
 *      produced eleven rows)
 *
 * Writes to a real tenantId then deletes everything it created.
 *
 * Run: npm run test-sheets
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { list, append, appendMany, update, remove, findBy, audit, HEADERS } from '../lib/sheets/erpSheets';

const TEST_TENANT = '__roundtrip_test__';
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

async function cleanup() {
  for (const tab of ['users', 'roles', 'attendance', 'audit'] as const) {
    let guard = 0;
    // remove() deletes one matching row per call, so loop until none are left.
    while (guard++ < 50) {
      const rows = await list<Record<string, string>>(tab, TEST_TENANT);
      if (rows.length === 0) break;
      const keyCol = HEADERS[tab].includes('id') ? 'id' : 'tenantId';
      const keyVal = HEADERS[tab].includes('id') ? rows[0].id : TEST_TENANT;
      const removed = await remove(tab, keyCol, keyVal);
      if (!removed) break;
    }
  }
}

async function main() {
  console.log('\n=== Google Sheets adapter round-trip test ===\n');

  console.log('0. Cleaning up any leftovers from a previous run');
  await cleanup();

  // ---- 1. append + read back, field by field ----
  console.log('\n1. append() then list() — do keys and values survive intact?');
  const user = {
    id: 'u_test_1',
    tenantId: TEST_TENANT,
    code: 'EMP001',
    name: "O'Brien, Anne-Marie",       // apostrophe + hyphen
    email: 'anne@example.com',
    phone: '+91 98765 43210',
    passwordHash: '$2b$10$abcdefghijklmnop',
    status: 'ACTIVE',
    avatarUrl: '',
    createdAt: '2026-07-26T12:00:00.000Z',
    createdBy: 'system',
  };
  await append('users', user);

  const readBack = await findBy<Record<string, string>>('users', 'id', 'u_test_1', TEST_TENANT);
  check('row is found after append', readBack !== null);

  if (readBack) {
    const missingKeys = HEADERS.users.filter((h) => !(h in readBack));
    check('every header is present as an object key', missingKeys.length === 0, `missing: ${missingKeys.join(', ')}`);

    for (const [k, v] of Object.entries(user)) {
      check(`  ${k} === ${JSON.stringify(v)}`, readBack[k] === v, `got ${JSON.stringify(readBack[k])}`);
    }
  }

  // ---- 2. repeated writes must NOT duplicate (the Excel spliceRows bug) ----
  console.log('\n2. Four sequential appends — does the row count stay honest?');
  console.log('   (Excel adapter produced 1, 2, 5, 11 here)');
  const counts: number[] = [];
  for (let i = 2; i <= 5; i++) {
    await append('users', {
      id: `u_test_${i}`,
      tenantId: TEST_TENANT,
      code: `EMP00${i}`,
      name: `User ${i}`,
      email: `u${i}@example.com`,
      status: 'ACTIVE',
      createdAt: new Date(0).toISOString(),
      createdBy: 'system',
    });
    counts.push((await list('users', TEST_TENANT)).length);
  }
  console.log(`   row counts after each append: ${counts.join(', ')}`);
  check('counts are exactly 2,3,4,5 (no duplication)', JSON.stringify(counts) === JSON.stringify([2, 3, 4, 5]), `got ${counts.join(', ')}`);

  // ---- 3. update replaces in place ----
  console.log('\n3. update() — does it replace the row rather than append a duplicate?');
  const before = (await list('users', TEST_TENANT)).length;
  const updated = await update('users', 'id', 'u_test_3', { name: 'RENAMED', status: 'SUSPENDED' });
  check('update() reports success', updated === true);

  const after = (await list('users', TEST_TENANT)).length;
  check('row count unchanged by update', before === after, `${before} -> ${after}`);

  const u3 = await findBy<Record<string, string>>('users', 'id', 'u_test_3', TEST_TENANT);
  check('patched fields changed', u3?.name === 'RENAMED' && u3?.status === 'SUSPENDED', `name=${u3?.name} status=${u3?.status}`);
  check('unpatched fields preserved', u3?.code === 'EMP003' && u3?.email === 'u3@example.com', `code=${u3?.code} email=${u3?.email}`);

  // ---- 4. update on a missing key must report false, not silently succeed ----
  console.log('\n4. update() on a non-existent id');
  const ghost = await update('users', 'id', 'does_not_exist', { name: 'x' });
  check('returns false instead of silently succeeding', ghost === false);

  // ---- 5. tenant isolation ----
  console.log('\n5. Tenant isolation');
  await append('users', {
    id: 'u_other_tenant',
    tenantId: 'some_other_tenant',
    code: 'X',
    name: 'Other',
    status: 'ACTIVE',
  });
  const mine = await list<Record<string, string>>('users', TEST_TENANT);
  check('other tenant rows excluded', mine.every((r) => r.tenantId === TEST_TENANT));
  check('unfiltered list sees both', (await list('users')).length > mine.length);
  await remove('users', 'id', 'u_other_tenant');

  // ---- 6. types that are not strings ----
  console.log('\n6. Booleans and numbers');
  await append('roles', {
    id: 'r_test_1',
    tenantId: TEST_TENANT,
    key: 'admin',
    title: 'Administrator',
    pack: 'INSTITUTION',
    rank: 9,                 // number
    kind: 'STAFF',
    mayHoldReports: true,    // boolean
    maxDelegableRank: 0,     // number zero — must not become ''
    color: '#dc2626',
    system: false,           // boolean false — must not become ''
  });
  const role = await findBy<Record<string, string>>('roles', 'id', 'r_test_1', TEST_TENANT);
  check('number 9 round-trips', role?.rank === '9', `got ${JSON.stringify(role?.rank)}`);
  check('number 0 round-trips (not blank)', role?.maxDelegableRank === '0', `got ${JSON.stringify(role?.maxDelegableRank)}`);
  check('true round-trips', role?.mayHoldReports === 'true', `got ${JSON.stringify(role?.mayHoldReports)}`);
  check('false round-trips (not blank)', role?.system === 'false', `got ${JSON.stringify(role?.system)}`);

  // ---- 7. appendMany ----
  console.log('\n7. appendMany()');
  await appendMany('attendance', [1, 2, 3].map((i) => ({
    id: `att_test_${i}`,
    tenantId: TEST_TENANT,
    userId: 'u_test_1',
    date: `2026-07-2${i}`,
    status: 'PRESENT',
    markedBy: 'system',
    markedAt: new Date(0).toISOString(),
  })));
  check('3 rows appended in one call', (await list('attendance', TEST_TENANT)).length === 3);

  // ---- 8. remove ----
  console.log('\n8. remove()');
  const beforeDel = (await list('users', TEST_TENANT)).length;
  const removed = await remove('users', 'id', 'u_test_2');
  check('remove() reports success', removed === true);
  const afterDel = (await list('users', TEST_TENANT)).length;
  check('exactly one row disappeared', afterDel === beforeDel - 1, `${beforeDel} -> ${afterDel}`);
  check('the right row went', (await findBy('users', 'id', 'u_test_2', TEST_TENANT)) === null);
  check('a sibling row survived', (await findBy('users', 'id', 'u_test_1', TEST_TENANT)) !== null);
  check('remove() on missing row returns false', (await remove('users', 'id', 'nope')) === false);

  // ---- 9. audit helper ----
  console.log('\n9. audit()');
  await audit({
    tenantId: TEST_TENANT,
    action: 'UPDATE',
    entityType: 'user',
    entityId: 'u_test_1',
    actorId: 'system',
    before: { name: 'old' },
    after: { name: 'new' },
    reason: 'round-trip test',
  });
  const auditRows = await list<Record<string, string>>('audit', TEST_TENANT);
  check('audit row written', auditRows.length === 1);
  check('audit lands in the right columns', auditRows[0]?.action === 'UPDATE' && auditRows[0]?.entityType === 'user' && auditRows[0]?.actorId === 'system',
    JSON.stringify(auditRows[0]));
  check('before/after stored as JSON', auditRows[0]?.after === '{"name":"new"}', `got ${JSON.stringify(auditRows[0]?.after)}`);

  // ---- cleanup ----
  console.log('\n10. Cleanup');
  await cleanup();
  const leftover =
    (await list('users', TEST_TENANT)).length +
    (await list('roles', TEST_TENANT)).length +
    (await list('attendance', TEST_TENANT)).length +
    (await list('audit', TEST_TENANT)).length;
  check('all test rows removed', leftover === 0, `${leftover} left behind`);

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nUnexpected failure:', err?.message || err);
  process.exit(1);
});
