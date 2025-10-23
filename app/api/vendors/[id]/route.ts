import { NextRequest, NextResponse } from 'next/server';
import vendorsData from '@/data/vendors.json';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = vendorsData.find((v: any) => v.id === parseInt(id));

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

    const vendor = vendorsData.find((v: any) => v.id === parseInt(id));

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Since we can't write to JSON file on Vercel, vendor edits are stored in localStorage
    // This endpoint returns success to maintain compatibility with the frontend
    // The actual persistence happens client-side via localStorage in VendorList component

    const updatedVendor = {
      ...vendor,
      ...updates
    };

    return NextResponse.json({
      success: true,
      vendor: updatedVendor
    });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update vendor' },
      { status: 500 }
    );
  }
}
