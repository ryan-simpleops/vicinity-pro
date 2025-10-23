import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db/database';

initDB();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId');

    if (!opportunityId) {
      return NextResponse.json(
        { error: 'opportunityId is required' },
        { status: 400 }
      );
    }

    const conversations = db.prepare(
      'SELECT * FROM conversations WHERE opportunity_id = ? ORDER BY created_at DESC'
    ).all(opportunityId);

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
