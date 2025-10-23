import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const filePath = path.join(process.cwd(), 'data', 'vendors.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const vendors = JSON.parse(fileContents);

    const vendor = vendors.find((v: any) => v.id === parseInt(id));

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ vendor });
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const filePath = path.join(process.cwd(), 'data', 'vendors.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const vendors = JSON.parse(fileContents);

    const vendorIndex = vendors.findIndex((v: any) => v.id === parseInt(id));

    if (vendorIndex === -1) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update vendor with new data
    vendors[vendorIndex] = {
      ...vendors[vendorIndex],
      ...updates
    };

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(vendors, null, 2));

    return NextResponse.json({
      success: true,
      vendor: vendors[vendorIndex]
    });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update vendor' },
      { status: 500 }
    );
  }
}
