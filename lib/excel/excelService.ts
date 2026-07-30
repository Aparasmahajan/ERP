import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';
import type { Position, OrgUnit, ExcelCapability, BrandingConfig, ModuleFeature, AuditEvent } from '@/lib/types/domain';

const DATA_DIR = path.join(process.cwd(), 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');

export interface ExcelSheetConfig {
  name: string;
  headers: string[];
  hidden?: boolean;
}

export class ExcelService {
  private workbookPath: string;
  private tenantId?: string;

  constructor(filename: string = 'erp-data.xlsx', tenantId?: string) {
    this.tenantId = tenantId;
    if (tenantId) {
      this.workbookPath = path.join(TENANTS_DIR, tenantId, `${tenantId}.xlsx`);
    } else {
      this.workbookPath = path.join(DATA_DIR, filename);
    }
  }

  async ensureDataDir(): Promise<void> {
    try {
      const dir = this.tenantId ? path.join(TENANTS_DIR, this.tenantId) : DATA_DIR;
      await fs.mkdir(dir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    this.workbookPath = path.join(TENANTS_DIR, tenantId, `${tenantId}.xlsx`);
  }

  async initializeWorkbook(sheets: ExcelSheetConfig[]): Promise<void> {
    await this.ensureDataDir();

    const workbook = new ExcelJS.Workbook();
    sheets.forEach((sheet) => {
      // exceljs expects `state`, not a `hidden` boolean.
      const worksheet = workbook.addWorksheet(sheet.name, sheet.hidden ? { state: 'hidden' } : undefined);
      worksheet.columns = sheet.headers.map((header) => ({
        header,
        width: 20,
      })) as ExcelJS.Column[];
      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' },
      };
    });

    await workbook.xlsx.writeFile(this.workbookPath);
  }

  async readSheet<T>(sheetName: string): Promise<T[]> {
    await this.ensureDataDir();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.workbookPath);
      const worksheet = workbook.getWorksheet(sheetName);

      if (!worksheet) {
        return [];
      }

      const rows: T[] = [];
      const headers = worksheet.getRow(1).values as string[];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header) {
            obj[this.toCamelCase(header)] = row.getCell(index).value;
          }
        });
        if (Object.keys(obj).some((key) => obj[key] !== null && obj[key] !== undefined)) {
          rows.push(obj as T);
        }
      });

      return rows;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  async writeSheet<T>(sheetName: string, data: T[]): Promise<void> {
    await this.ensureDataDir();

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(this.workbookPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    let worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      worksheet = workbook.addWorksheet(sheetName);
    } else {
      worksheet.spliceRows(2, worksheet.rowCount - 1);
    }

    if (data.length === 0) {
      await workbook.xlsx.writeFile(this.workbookPath);
      return;
    }

    // Get headers from first data object
    const headers = Object.keys(data[0] as Record<string, unknown>);
    // Partial column descriptors are accepted at runtime but no longer match the
    // Column[] type, so state the shape explicitly.
    worksheet.columns = headers.map((header) => ({
      header: this.toTitleCase(header),
      width: 20,
    })) as ExcelJS.Column[];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };

    // Add data rows
    data.forEach((row) => {
      worksheet!.addRow(headers.map((h) => (row as any)[h]));
    });

    await workbook.xlsx.writeFile(this.workbookPath);
  }

  async appendSheet<T>(sheetName: string, data: T[]): Promise<void> {
    await this.ensureDataDir();

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(this.workbookPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    let worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      worksheet = workbook.addWorksheet(sheetName);
    }

    if (data.length === 0) {
      await workbook.xlsx.writeFile(this.workbookPath);
      return;
    }

    const headers = Object.keys(data[0] as Record<string, unknown>);

    // Initialize headers if sheet is empty
    if (worksheet.rowCount === 0) {
      worksheet.columns = headers.map((header) => ({
        header: this.toTitleCase(header),
        width: 20,
      })) as ExcelJS.Column[];
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' },
      };
    }

    data.forEach((row) => {
      worksheet!.addRow(headers.map((h) => (row as any)[h]));
    });

    await workbook.xlsx.writeFile(this.workbookPath);
  }

  async deleteFromSheet<T>(
    sheetName: string,
    predicate: (row: T) => boolean
  ): Promise<void> {
    const data = await this.readSheet<T>(sheetName);
    const filtered = data.filter((row) => !predicate(row));
    await this.writeSheet(sheetName, filtered);
  }

  async updateSheet<T>(
    sheetName: string,
    predicate: (row: T) => boolean,
    updates: Partial<T>
  ): Promise<void> {
    const data = await this.readSheet<T>(sheetName);
    const updated = data.map((row) =>
      predicate(row) ? { ...row, ...updates } : row
    );
    await this.writeSheet(sheetName, updated);
  }

  // ============ NEW MULTI-TENANT METHODS (Week 1) ============

  async readPositions(): Promise<Position[]> {
    return this.readSheet<Position>('positions');
  }

  async writePositions(positions: Position[]): Promise<void> {
    return this.writeSheet<Position>('positions', positions);
  }

  async readOrgUnits(): Promise<OrgUnit[]> {
    return this.readSheet<OrgUnit>('org_units');
  }

  async writeOrgUnits(units: OrgUnit[]): Promise<void> {
    return this.writeSheet<OrgUnit>('org_units', units);
  }

  async readCapabilities(): Promise<ExcelCapability[]> {
    return this.readSheet<ExcelCapability>('capabilities');
  }

  async writeCapabilities(capabilities: ExcelCapability[]): Promise<void> {
    return this.writeSheet<ExcelCapability>('capabilities', capabilities);
  }

  async readBranding(): Promise<BrandingConfig> {
    try {
      const rows = await this.readSheet<any>('branding');
      const config: BrandingConfig = {};
      rows.forEach((row) => {
        if (row.key) {
          config[row.key] = row.value;
        }
      });
      return config;
    } catch {
      return {};
    }
  }

  async writeBranding(config: BrandingConfig): Promise<void> {
    const rows = Object.entries(config).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }));
    return this.writeSheet<any>('branding', rows);
  }

  async readModuleFeatures(): Promise<ModuleFeature[]> {
    return this.readSheet<ModuleFeature>('module_features');
  }

  async writeModuleFeatures(features: ModuleFeature[]): Promise<void> {
    return this.writeSheet<ModuleFeature>('module_features', features);
  }

  async writeAudit(entry: AuditEvent): Promise<void> {
    return this.appendSheet<AuditEvent>('audit', [entry]);
  }

  private toCamelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    ).replace(/\s+/g, '');
  }

  private toTitleCase(str: string): string {
    return str.replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}

export const excelService = new ExcelService();

// ============ STANDALONE FUNCTIONS FOR WEEK 1 ============

export async function readPositions(tenantId: string): Promise<Position[]> {
  const service = new ExcelService(undefined, tenantId);
  return service.readPositions();
}

export async function writePositions(tenantId: string, positions: Position[]): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writePositions(positions);
}

export async function readCapabilities(tenantId: string): Promise<ExcelCapability[]> {
  const service = new ExcelService(undefined, tenantId);
  return service.readCapabilities();
}

export async function writeCapabilities(tenantId: string, capabilities: ExcelCapability[]): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writeCapabilities(capabilities);
}

export async function readOrgUnits(tenantId: string): Promise<OrgUnit[]> {
  const service = new ExcelService(undefined, tenantId);
  return service.readOrgUnits();
}

export async function writeOrgUnits(tenantId: string, units: OrgUnit[]): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writeOrgUnits(units);
}

export async function readBranding(tenantId: string): Promise<BrandingConfig> {
  const service = new ExcelService(undefined, tenantId);
  return service.readBranding();
}

export async function writeBranding(tenantId: string, config: BrandingConfig): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writeBranding(config);
}

export async function readModuleFeatures(tenantId: string): Promise<ModuleFeature[]> {
  const service = new ExcelService(undefined, tenantId);
  return service.readModuleFeatures();
}

export async function writeModuleFeatures(tenantId: string, features: ModuleFeature[]): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writeModuleFeatures(features);
}

export async function writeAudit(tenantId: string, entry: AuditEvent): Promise<void> {
  const service = new ExcelService(undefined, tenantId);
  return service.writeAudit(entry);
}
