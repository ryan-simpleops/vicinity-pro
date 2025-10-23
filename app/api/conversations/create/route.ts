import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db/database';
import { randomUUID } from 'crypto';

initDB();

export async function POST(request: NextRequest) {
  try {
    const { vendorId, opportunityId, vendorEmail } = await request.json();

    if (!vendorId || !opportunityId || !vendorEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existing = db.prepare(
      'SELECT id FROM conversations WHERE vendor_id = ? AND opportunity_id = ?'
    ).get(vendorId, opportunityId);

    if (existing) {
      return NextResponse.json({
        success: true,
        conversationId: (existing as any).id,
        existed: true
      });
    }

    // Create new conversation
    const conversationId = randomUUID();
    db.prepare(`
      INSERT INTO conversations (id, vendor_id, opportunity_id, vendor_email, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(conversationId, vendorId, opportunityId, vendorEmail, 'pending');

    // Record initial email message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      conversationId,
      'outbound',
      'New Project Opportunity - Waste Management Services',
      'Initial opportunity email sent with Yes/No response buttons'
    );

    return NextResponse.json({
      success: true,
      conversationId,
      existed: false
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
