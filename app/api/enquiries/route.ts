import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';
import { v4 as uuidv4 } from 'uuid';

interface Enquiry {
  id: string;
  template: string;
  name: string;
  email: string;
  organization: string;
  message: string;
  status: 'NEW' | 'REVIEWING' | 'CONTACTED' | 'CONVERTED';
  createdAt: string;
}

const SHEET_NAME = 'enquiries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, name, email, organization, message } = body;

    if (!template || !name || !email || !organization) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const enquiry: Enquiry = {
      id: uuidv4(),
      template,
      name,
      email,
      organization,
      message,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    const enquiries = await excelService.readSheet<Enquiry>(SHEET_NAME);
    enquiries.push(enquiry);
    await excelService.writeSheet(SHEET_NAME, enquiries);

    return NextResponse.json(enquiry, { status: 201 });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return NextResponse.json(
      { error: 'Failed to submit enquiry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const enquiries = await excelService.readSheet<Enquiry>(SHEET_NAME);
    return NextResponse.json({ data: enquiries });
  } catch (error) {
    console.error('Error reading enquiries:', error);
    return NextResponse.json(
      { error: 'Failed to read enquiries' },
      { status: 500 }
    );
  }
}
