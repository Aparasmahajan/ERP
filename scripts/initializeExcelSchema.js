#!/usr/bin/env node

/**
 * Initialize Excel Schema for Soft Launch
 *
 * This script creates/updates Excel files with all required sheets and columns
 * for Phase 1 soft launch (hierarchy, roles, permissions, audit trail)
 *
 * Run: node scripts/initializeExcelSchema.js
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const DEMO_TENANT_ID = 'demo-institution';
const DATA_DIR = path.join(__dirname, '../data/tenants');

// Color schemes for headers
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const BORDER_STYLE = { style: 'thin', color: { argb: 'FFC0C0C0' } };

// Sheet definitions
const SHEETS = {
  users: {
    name: 'users',
    description: 'All users in the tenant',
    columns: [
      { header: 'id', width: 12, key: 'id' },
      { header: 'code', width: 12, key: 'code' },
      { header: 'name', width: 25, key: 'name' },
      { header: 'email', width: 30, key: 'email' },
      { header: 'phone', width: 15, key: 'phone' },
      { header: 'role_ids', width: 20, key: 'role_ids' },
      { header: 'status', width: 12, key: 'status' },
      { header: 'avatar_url', width: 30, key: 'avatar_url' },
      { header: 'created_at', width: 20, key: 'created_at' },
      { header: 'created_by', width: 15, key: 'created_by' },
    ],
    sampleData: [
      {
        id: 'u1',
        code: 'PRIN001',
        name: 'Dr. Richard Thompson',
        email: 'principal@school.com',
        phone: '9876543210',
        role_ids: 'r1',
        status: 'ACTIVE',
        avatar_url: '',
        created_at: new Date().toISOString(),
        created_by: 'system',
      },
    ],
  },

  positions: {
    name: 'positions',
    description: 'Position hierarchy - who reports to whom',
    columns: [
      { header: 'user_id', width: 12, key: 'user_id' },
      { header: 'reports_to_user_id', width: 18, key: 'reports_to_user_id' },
      { header: 'org_unit_id', width: 15, key: 'org_unit_id' },
      { header: 'title_override', width: 25, key: 'title_override' },
      { header: 'span_hint', width: 12, key: 'span_hint' },
      { header: 'valid_from', width: 15, key: 'valid_from' },
      { header: 'valid_to', width: 15, key: 'valid_to' },
      { header: 'session_id', width: 15, key: 'session_id' },
    ],
    sampleData: [
      {
        user_id: 'u1',
        reports_to_user_id: null,
        org_unit_id: 'ou1',
        title_override: 'Principal',
        span_hint: 5,
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: null,
        session_id: 'session1',
      },
    ],
  },

  roles: {
    name: 'roles',
    description: 'Pre-configured roles from seed data',
    columns: [
      { header: 'id', width: 12, key: 'id' },
      { header: 'key', width: 18, key: 'key' },
      { header: 'title', width: 25, key: 'title' },
      { header: 'pack', width: 12, key: 'pack' },
      { header: 'rank', width: 8, key: 'rank' },
      { header: 'kind', width: 12, key: 'kind' },
      { header: 'may_hold_reports', width: 15, key: 'may_hold_reports' },
      { header: 'max_delegable_rank', width: 18, key: 'max_delegable_rank' },
      { header: 'color', width: 12, key: 'color' },
      { header: 'system', width: 10, key: 'system' },
    ],
    sampleData: [
      {
        id: 'r1',
        key: 'PRINCIPAL',
        title: 'Principal',
        pack: 'INSTITUTION',
        rank: 1,
        kind: 'LINE',
        may_hold_reports: true,
        max_delegable_rank: 2,
        color: '#2563eb',
        system: true,
      },
    ],
  },

  org_units: {
    name: 'org_units',
    description: 'Departments, teams, locations',
    columns: [
      { header: 'id', width: 12, key: 'id' },
      { header: 'name', width: 25, key: 'name' },
      { header: 'parent_unit_id', width: 15, key: 'parent_unit_id' },
      { header: 'head_user_id', width: 12, key: 'head_user_id' },
      { header: 'location_code', width: 12, key: 'location_code' },
      { header: 'address', width: 30, key: 'address' },
      { header: 'contact_phone', width: 15, key: 'contact_phone' },
      { header: 'status', width: 12, key: 'status' },
    ],
    sampleData: [
      {
        id: 'ou1',
        name: 'School Administration',
        parent_unit_id: null,
        head_user_id: 'u1',
        location_code: 'HQ',
        address: '123 School Street',
        contact_phone: '9876543210',
        status: 'ACTIVE',
      },
    ],
  },

  capabilities: {
    name: 'capabilities',
    description: 'Fine-grained permissions granted to users',
    columns: [
      { header: 'user_id', width: 12, key: 'user_id' },
      { header: 'capability', width: 30, key: 'capability' },
      { header: 'scope', width: 18, key: 'scope' },
      { header: 'granted_by', width: 12, key: 'granted_by' },
      { header: 'granted_at', width: 20, key: 'granted_at' },
      { header: 'expires_at', width: 20, key: 'expires_at' },
      { header: 'delegable', width: 10, key: 'delegable' },
    ],
    sampleData: [
      {
        user_id: 'u1',
        capability: 'iam.grant.assign',
        scope: 'TENANT',
        granted_by: 'system',
        granted_at: new Date().toISOString(),
        expires_at: null,
        delegable: true,
      },
      {
        user_id: 'u1',
        capability: 'people.create',
        scope: 'TENANT',
        granted_by: 'system',
        granted_at: new Date().toISOString(),
        expires_at: null,
        delegable: true,
      },
    ],
  },

  audit: {
    name: 'audit',
    description: 'Audit trail - all changes logged here',
    columns: [
      { header: 'id', width: 12, key: 'id' },
      { header: 'timestamp', width: 25, key: 'timestamp' },
      { header: 'action', width: 20, key: 'action' },
      { header: 'entity_type', width: 15, key: 'entity_type' },
      { header: 'entity_id', width: 12, key: 'entity_id' },
      { header: 'who', width: 12, key: 'who' },
      { header: 'before', width: 40, key: 'before' },
      { header: 'after', width: 40, key: 'after' },
      { header: 'reason', width: 25, key: 'reason' },
      { header: 'ip_address', width: 15, key: 'ip_address' },
    ],
    sampleData: [
      {
        id: 'a1',
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        entity_type: 'user',
        entity_id: 'u1',
        who: 'system',
        before: '{}',
        after: '{"name":"Dr. Richard Thompson","role_ids":"r1"}',
        reason: 'Initial setup',
        ip_address: '127.0.0.1',
      },
    ],
  },

  branding: {
    name: 'branding',
    description: 'Tenant branding configuration',
    columns: [
      { header: 'key', width: 20, key: 'key' },
      { header: 'value', width: 30, key: 'value' },
      { header: 'updated_at', width: 20, key: 'updated_at' },
      { header: 'updated_by', width: 15, key: 'updated_by' },
    ],
    sampleData: [
      { key: 'primary_color', value: '#2563eb', updated_at: new Date().toISOString(), updated_by: 'system' },
      { key: 'secondary_color', value: '#7c3aed', updated_at: new Date().toISOString(), updated_by: 'system' },
      { key: 'logo_url', value: '', updated_at: new Date().toISOString(), updated_by: 'system' },
      { key: 'domain', value: 'app.example.com', updated_at: new Date().toISOString(), updated_by: 'system' },
    ],
  },

  module_features: {
    name: 'module_features',
    description: 'Feature toggles (22 retail features + others)',
    columns: [
      { header: 'feature_id', width: 25, key: 'feature_id' },
      { header: 'name', width: 30, key: 'name' },
      { header: 'category', width: 20, key: 'category' },
      { header: 'enabled', width: 10, key: 'enabled' },
      { header: 'description', width: 40, key: 'description' },
      { header: 'phase', width: 10, key: 'phase' },
    ],
    sampleData: [
      // Retail Features
      { feature_id: 'retail_barcode_scan', name: 'Barcode Scanning', category: 'Scanning', enabled: false, description: 'Scan products for fast checkout', phase: 2 },
      { feature_id: 'retail_low_stock', name: 'Low Stock Warnings', category: 'Alerts', enabled: true, description: 'Alert when items running low', phase: 2 },
      { feature_id: 'retail_daily_recap', name: 'Daily Sales Recap', category: 'Alerts', enabled: true, description: 'Summary at end of day', phase: 2 },
      { feature_id: 'retail_loyalty', name: 'Loyalty Program', category: 'Customer', enabled: false, description: 'Customers earn points', phase: 6 },
      { feature_id: 'retail_credit', name: 'Buy on Credit', category: 'Customer', enabled: false, description: 'Allow customers to owe', phase: 2 },
      { feature_id: 'retail_transfers', name: 'Inter-Store Transfers', category: 'Inventory', enabled: false, description: 'Transfer stock between stores', phase: 2 },
      { feature_id: 'retail_recount', name: 'Stock Reconciliation', category: 'Inventory', enabled: true, description: 'Physical count vs system', phase: 2 },
      // More can be added...
    ],
  },
};

/**
 * Format header row with styling
 */
function formatHeaderRow(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.fill = HEADER_FILL;
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  headerRow.height = 25;

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: BORDER_STYLE,
        left: BORDER_STYLE,
        bottom: BORDER_STYLE,
        right: BORDER_STYLE,
      };
    });
  });
}

/**
 * Initialize Excel workbook with all sheets
 */
async function initializeWorkbook(tenantId) {
  const workbook = new ExcelJS.Workbook();

  // Add all sheets
  for (const [sheetKey, sheetConfig] of Object.entries(SHEETS)) {
    const worksheet = workbook.addWorksheet(sheetConfig.name, { views: [{ state: 'frozen', ySplit: 1 }] });

    // Add columns
    worksheet.columns = sheetConfig.columns;

    // Add header styling
    formatHeaderRow(worksheet);

    // Add sample data
    if (sheetConfig.sampleData && sheetConfig.sampleData.length > 0) {
      sheetConfig.sampleData.forEach((row) => {
        worksheet.addRow(row);
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      if (col.width < 15) col.width = 15;
    });
  }

  // Create tenant directory if not exists
  const tenantDir = path.join(DATA_DIR, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  // Save workbook
  const filePath = path.join(tenantDir, `${tenantId}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

/**
 * Main script
 */
async function main() {
  console.log('📊 Initializing Excel Schema for Soft Launch\n');

  try {
    // Create directory if not exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize demo tenant
    console.log(`📁 Creating workbook for tenant: ${DEMO_TENANT_ID}`);
    const filePath = await initializeWorkbook(DEMO_TENANT_ID);
    console.log(`✅ Created: ${filePath}\n`);

    // Print summary
    console.log('📋 Excel Schema Initialized:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(SHEETS).forEach(([key, config]) => {
      console.log(
        `  ✓ ${config.name.padEnd(20)} - ${config.columns.length} columns - ${config.sampleData?.length || 0} sample rows`
      );
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Sheets created:');
    console.log('  1. users - Store all users with roles');
    console.log('  2. positions - Hierarchy: who reports to whom');
    console.log('  3. roles - Pre-configured roles from seed data');
    console.log('  4. org_units - Departments, teams, locations');
    console.log('  5. capabilities - Fine-grained permissions');
    console.log('  6. audit - Audit trail of all changes');
    console.log('  7. branding - Tenant customization settings');
    console.log('  8. module_features - Feature toggles (22 retail features + more)\n');

    console.log('✨ Next steps:');
    console.log('  1. Integrate Cloudinary (lib/storage/cloudinaryService.ts)');
    console.log('  2. Integrate Resend.com (lib/email/resendService.ts)');
    console.log('  3. Build Role Assignment UI (/portal/[tenant]/roles)');
    console.log('  4. Build Org Chart Visualization');
    console.log('  5. Build Capability Management\n');

    console.log('🚀 To create a new tenant, call: initializeWorkbook("tenant-id")\n');
  } catch (error) {
    console.error('❌ Error initializing Excel schema:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { initializeWorkbook, SHEETS };
