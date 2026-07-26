import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';

interface BrandingConfig {
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
  updatedAt: string;
}

const SHEET_NAME = 'branding_config';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';

    const configs = await excelService.readSheet<BrandingConfig>(SHEET_NAME);
    const config = configs.find(c => c.tenantId === tenantId);

    if (!config) {
      // Return defaults
      return NextResponse.json({
        tenantId,
        primaryColor: '#2563eb',
        secondaryColor: '#7c3aed',
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading branding config:', error);
    return NextResponse.json(
      { error: 'Failed to read branding config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();

    const configs = await excelService.readSheet<BrandingConfig>(SHEET_NAME);
    const existingIndex = configs.findIndex(c => c.tenantId === tenantId);

    const newConfig: BrandingConfig = {
      tenantId,
      primaryColor: body.primaryColor || '#2563eb',
      secondaryColor: body.secondaryColor || '#7c3aed',
      logoUrl: body.logoUrl,
      faviconUrl: body.faviconUrl,
      customDomain: body.customDomain,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }

    await excelService.writeSheet(SHEET_NAME, configs);

    return NextResponse.json(newConfig);
  } catch (error) {
    console.error('Error updating branding config:', error);
    return NextResponse.json(
      { error: 'Failed to update branding config' },
      { status: 500 }
    );
  }
}
