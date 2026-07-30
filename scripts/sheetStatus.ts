/**
 * Row counts per tab, and a timed single read — to tell "the sheet is huge" apart from
 * "we are being rate limited".
 *
 * Run: npm run sheet-status
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { list, HEADERS, clearCache } from '../lib/sheets/erpSheets';

async function main() {
  console.log('\n=== Sheet status ===\n');

  const t0 = Date.now();
  let total = 0;

  for (const tab of Object.keys(HEADERS)) {
    const start = Date.now();
    try {
      const rows = await list<any>(tab as any);
      total += rows.length;
      const ms = Date.now() - start;
      const flag = ms > 3000 ? '  <-- slow' : '';
      console.log(`  ${tab.padEnd(17)} ${String(rows.length).padStart(5)} rows   ${String(ms).padStart(6)}ms${flag}`);
    } catch (err: any) {
      console.log(`  ${tab.padEnd(17)}  ERROR  ${err?.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n  total rows: ${total}`);
  console.log(`  elapsed   : ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Second pass with a cold cache: if this is far slower, we are being throttled rather
  // than merely reading a lot of data.
  clearCache();
  const t1 = Date.now();
  await list<any>('enquiries');
  console.log(`  cold single read of enquiries: ${Date.now() - t1}ms`);
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
