import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';

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
    const existing = await sql`
      SELECT id FROM conversations
      WHERE vendor_id = ${vendorId} AND opportunity_id = ${opportunityId}
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        conversationId: existing.rows[0].id,
        existed: true
      });
    }

    // Create new conversation
    const conversationId = randomUUID();
    await sql`
      INSERT INTO conversations (id, vendor_id, opportunity_id, vendor_email, status)
      VALUES (${conversationId}, ${vendorId}, ${opportunityId}, ${vendorEmail}, 'pending')
    `;

    // Record initial email message
    await sql`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (
        ${randomUUID()},
        ${conversationId},
        'outbound',
        'New Project Opportunity - Waste Management Services',
        'Initial opportunity email sent with Yes/No response buttons'
      )
    `;

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
