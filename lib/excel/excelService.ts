import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface ExcelSheetConfig {
  name: string;
  headers: string[];
  hidden?: boolean;
}

export class ExcelService {
  private workbookPath: string;

  constructor(filename: string = 'erp-data.xlsx') {
    this.workbookPath = path.join(DATA_DIR, filename);
  }

  async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async initializeWorkbook(sheets: ExcelSheetConfig[]): Promise<void> {
    await this.ensureDataDir();

    const workbook = new ExcelJS.Workbook();
    sheets.forEach((sheet) => {
      const worksheet = workbook.addWorksheet(sheet.name, { hidden: sheet.hidden });
      worksheet.columns = sheet.headers.map((header) => ({
        header,
        width: 20,
      }));
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
    const headers = Object.keys(data[0]);
    worksheet.columns = headers.map((header) => ({
      header: this.toTitleCase(header),
      width: 20,
    }));

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

    const headers = Object.keys(data[0]);

    // Initialize headers if sheet is empty
    if (worksheet.rowCount === 0) {
      worksheet.columns = headers.map((header) => ({
        header: this.toTitleCase(header),
        width: 20,
      }));
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
