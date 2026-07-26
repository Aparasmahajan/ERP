import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import ExcelJS from 'exceljs';

const TENANTS_DIR = path.join(process.cwd(), 'data', 'tenants');

interface InitTenantRequest {
  tenantName: string;
  pack: 'INSTITUTION' | 'ORGANISATION' | 'HYBRID' | 'CUSTOM';
  adminEmail: string;
  adminName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InitTenantRequest = await request.json();
    const { tenantName, pack, adminEmail, adminName } = body;

    if (!tenantName || !pack || !adminEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantName, pack, adminEmail' },
        { status: 400 }
      );
    }

    const tenantId = uuid();
    const tenantDir = path.join(TENANTS_DIR, tenantId);

    // Create directory
    await fs.mkdir(tenantDir, { recursive: true });

    // Create Excel workbook with all sheets
    const workbook = new ExcelJS.Workbook();

    // Define sheets with headers
    const sheets = [
      {
        name: 'users',
        headers: ['id', 'code', 'name', 'email', 'phone', 'role_ids', 'status', 'avatar_url', 'created_at', 'created_by'],
      },
      {
        name: 'positions',
        headers: ['user_id', 'reports_to_user_id', 'org_unit_id', 'title_override', 'span_hint', 'valid_from', 'valid_to', 'session_id'],
      },
      {
        name: 'roles',
        headers: ['id', 'key', 'title', 'pack', 'rank', 'kind', 'may_hold_reports', 'max_delegable_rank', 'color', 'system'],
      },
      {
        name: 'org_units',
        headers: ['id', 'name', 'parent_unit_id', 'head_user_id', 'location_code', 'address', 'contact_phone', 'status'],
      },
      {
        name: 'capabilities',
        headers: ['user_id', 'capability', 'scope', 'granted_by', 'granted_at', 'expires_at', 'delegable'],
      },
      {
        name: 'audit',
        headers: ['id', 'timestamp', 'action', 'entity_type', 'entity_id', 'who', 'before', 'after', 'reason', 'ip_address'],
      },
      {
        name: 'branding',
        headers: ['key', 'value', 'updated_at', 'updated_by'],
      },
      {
        name: 'module_features',
        headers: ['feature_id', 'name', 'category', 'enabled', 'description', 'phase'],
      },
    ];

    // Create sheets with formatted headers
    sheets.forEach((sheetConfig) => {
      const worksheet = workbook.addWorksheet(sheetConfig.name);
      worksheet.columns = sheetConfig.headers.map((header) => ({
        header,
        width: 20,
      }));

      // Format header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563eb' },
      };
      // exceljs vertical alignment is 'middle', not 'center' ('center' is horizontal-only).
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add sample data for admin user
    const adminId = uuid();
    const usersSheet = workbook.getWorksheet('users');
    usersSheet?.addRow([
      adminId,
      'ADMIN001',
      adminName || 'Administrator',
      adminEmail,
      '',
      'admin',
      'ACTIVE',
      '',
      new Date().toISOString(),
      'system',
    ]);

    // Add sample org unit
    const orgUnitId = uuid();
    const orgUnitsSheet = workbook.getWorksheet('org_units');
    orgUnitsSheet?.addRow([
      orgUnitId,
      'Main Office',
      null,
      adminId,
      'HQ',
      '',
      '',
      'ACTIVE',
    ]);

    // Add sample position
    const sessionId = `SESSION_${new Date().getFullYear()}`;
    const positionsSheet = workbook.getWorksheet('positions');
    positionsSheet?.addRow([
      adminId,
      null,
      orgUnitId,
      'Administrator',
      null,
      new Date().toISOString(),
      null,
      sessionId,
    ]);

    // Add sample roles based on pack
    const rolesSheet = workbook.getWorksheet('roles');
    const sampleRoles = getSampleRoles(pack, tenantId);
    sampleRoles.forEach((role) => {
      rolesSheet?.addRow([
        role.id,
        role.key,
        role.title,
        role.pack,
        role.rank,
        role.kind,
        role.may_hold_reports ? 1 : 0,
        role.max_delegable_rank,
        role.color,
        role.system ? 1 : 0,
      ]);
    });

    // Add default branding
    const brandingSheet = workbook.getWorksheet('branding');
    brandingSheet?.addRow(['primary_color', '#2563eb', new Date().toISOString(), 'system']);
    brandingSheet?.addRow(['secondary_color', '#7c3aed', new Date().toISOString(), 'system']);
    brandingSheet?.addRow(['logo_url', '', new Date().toISOString(), 'system']);
    brandingSheet?.addRow(['domain', `${tenantName.toLowerCase().replace(/\s+/g, '-')}.erp`, new Date().toISOString(), 'system']);

    // Add sample module features
    const featuresSheet = workbook.getWorksheet('module_features');
    const sampleFeatures = getSampleFeatures();
    sampleFeatures.forEach((feature) => {
      featuresSheet?.addRow([
        feature.feature_id,
        feature.name,
        feature.category,
        feature.enabled ? 1 : 0,
        feature.description,
        feature.phase,
      ]);
    });

    // Save workbook
    const filePath = path.join(tenantDir, `${tenantId}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return NextResponse.json(
      {
        success: true,
        tenantId,
        tenantName,
        adminEmail,
        filePath: `data/tenants/${tenantId}/${tenantId}.xlsx`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tenant init error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tenant initialization failed' },
      { status: 500 }
    );
  }
}

function getSampleRoles(pack: string, tenantId: string) {
  const baseRoles = [
    { id: `role_${uuid()}`, key: 'admin', title: 'Administrator', rank: 9, kind: 'STAFF', may_hold_reports: true, max_delegable_rank: 8, color: '#dc2626', system: true },
    { id: `role_${uuid()}`, key: 'manager', title: 'Manager', rank: 7, kind: 'LINE', may_hold_reports: true, max_delegable_rank: 6, color: '#2563eb', system: true },
    { id: `role_${uuid()}`, key: 'supervisor', title: 'Supervisor', rank: 5, kind: 'LINE', may_hold_reports: true, max_delegable_rank: 4, color: '#7c3aed', system: true },
    { id: `role_${uuid()}`, key: 'staff', title: 'Staff', rank: 3, kind: 'LINE', may_hold_reports: false, max_delegable_rank: 0, color: '#0891b2', system: true },
  ];

  return baseRoles.map((role) => ({
    ...role,
    pack,
  }));
}

function getSampleFeatures() {
  return [
    { feature_id: 'retail_barcode_scan', name: 'Barcode Scanning', category: 'Scanning & Speed', enabled: false, description: 'Scan barcodes for fast product entry', phase: 2 },
    { feature_id: 'retail_low_stock', name: 'Low Stock Alerts', category: 'Alerts & Reminders', enabled: true, description: 'Get notified when stock falls below threshold', phase: 2 },
    { feature_id: 'retail_daily_recap', name: 'Daily Sales Summary', category: 'Alerts & Reminders', enabled: true, description: 'Receive daily email summary of sales', phase: 2 },
    { feature_id: 'retail_loyalty', name: 'Loyalty Program', category: 'Customer Features', enabled: false, description: 'Track and reward loyal customers', phase: 6 },
    { feature_id: 'retail_credit', name: 'Buy on Credit', category: 'Customer Features', enabled: false, description: 'Allow customers to purchase on credit', phase: 2 },
    { feature_id: 'retail_transfers', name: 'Stock Transfers', category: 'Inventory & Stock', enabled: false, description: 'Transfer stock between locations', phase: 2 },
    { feature_id: 'retail_recount', name: 'Stock Reconciliation', category: 'Inventory & Stock', enabled: true, description: 'Reconcile physical and system stock', phase: 2 },
    { feature_id: 'retail_expiry', name: 'Expiry Tracking', category: 'Inventory & Stock', enabled: false, description: 'Track expiry dates for products', phase: 3 },
    { feature_id: 'retail_receipt_digital', name: 'Digital Receipts', category: 'Customer Features', enabled: false, description: 'Send digital receipts via email/SMS', phase: 3 },
    { feature_id: 'retail_performance', name: 'Staff Performance', category: 'Staff Management', enabled: false, description: 'Track sales per staff member', phase: 3 },
    { feature_id: 'retail_bonus', name: 'Bonus Tracker', category: 'Staff Management', enabled: false, description: 'Calculate bonuses based on targets', phase: 4 },
    { feature_id: 'retail_sales_report', name: 'Sales Analytics', category: 'Data & Reports', enabled: false, description: 'Detailed sales reports and trends', phase: 3 },
    { feature_id: 'retail_product_analytics', name: 'Product Analytics', category: 'Data & Reports', enabled: false, description: 'Analyze product performance', phase: 4 },
    { feature_id: 'retail_customer_insights', name: 'Customer Insights', category: 'Data & Reports', enabled: false, description: 'Track customer purchase patterns', phase: 4 },
    { feature_id: 'retail_reorder', name: 'Reorder Suggestions', category: 'Smart Suggestions', enabled: false, description: 'AI-suggested reorder quantities', phase: 5 },
    { feature_id: 'retail_bundle', name: 'Bundle Deals', category: 'Smart Suggestions', enabled: false, description: 'Create and promote product bundles', phase: 5 },
    { feature_id: 'retail_dynamic_pricing', name: 'Smart Pricing', category: 'Smart Suggestions', enabled: false, description: 'Dynamic pricing based on demand', phase: 6 },
    { feature_id: 'retail_offline', name: 'Offline Billing', category: 'Connectivity', enabled: false, description: 'Continue operations offline', phase: 3 },
    { feature_id: 'retail_cloud_backup', name: 'Cloud Backup', category: 'Connectivity', enabled: true, description: 'Automatic cloud backup of data', phase: 2 },
  ];
}
