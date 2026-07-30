/**
 * Remove rows left behind by interrupted test runs.
 *
 * Test tenants are recognised by their org name / slug prefix, and test enquiries by the
 * marker in their id. Uses batch deletion so this stays inside the Sheets quota.
 *
 * Run: npm run clean-test-data
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { list, removeWhere, purgeTenant, type TabName } from '../lib/sheets/erpSheets';

const TENANT_TABS: TabName[] = [
  'users', 'roles', 'role_grants', 'user_roles', 'positions',
  'org_units', 'attendance', 'audit', 'branding', 'module_features', 'capabilities',
];

/**
 * Anything a test run could have created. Keep this in step with the org names used in
 * scripts/testFlow.ts and scripts/testPortal.ts — a name added there and missed here means
 * residue survives a crashed run and silently skews later assertions.
 */
const TEST_NAME = /^(flowtest|portaltest)/i;

const isTestTenant = (t: { slug?: string; name?: string }) =>
  TEST_NAME.test(t.slug || '') ||
  TEST_NAME.test(t.name || '') ||
  /^__roundtrip_test__/.test(t.slug || '');

async function main() {
  console.log('\n=== Clearing leftover test data ===\n');

  const tenants = await list<{ id: string; slug: string; name: string }>('tenants');
  const stale = tenants.filter(isTestTenant);

  if (stale.length === 0) {
    console.log('No stale test tenants found.');
  } else {
    console.log(`Found ${stale.length} test tenant(s): ${stale.map((t) => t.slug).join(', ')}\n`);
    for (const t of stale) {
      const removed = await purgeTenant(t.id, TENANT_TABS);
      const total = Object.values(removed).reduce((a, b) => a + b, 0);
      console.log(`  ${t.slug.padEnd(24)} purged ${total} rows`);
    }
    const n = await removeWhere<{ id: string; slug: string; name: string }>('tenants', isTestTenant);
    console.log(`  removed ${n} tenant row(s)`);
  }

  // Enquiries carry the marker in their id; also catch the roundtrip tenantId marker.
  const enq = await removeWhere<{ id: string; orgName: string }>(
    'enquiries',
    (e) => /__flowtest__|__roundtrip_test__/.test(e.id || '') || TEST_NAME.test(e.orgName || '')
  );
  console.log(`  removed ${enq} test enquiry row(s)`);

  // Stray rows from the adapter round-trip test, which uses a sentinel tenantId.
  let strays = 0;
  for (const tab of TENANT_TABS) {
    strays += await removeWhere<{ tenantId?: string }>(tab, (r) => r.tenantId === '__roundtrip_test__');
  }
  console.log(`  removed ${strays} stray round-trip row(s)`);

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
