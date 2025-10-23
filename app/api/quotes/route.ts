import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const opportunityId = searchParams.get('opportunityId');

    // If fetching for a specific conversation
    if (conversationId) {
      const conversationResult = await sql`
        SELECT * FROM conversations WHERE id = ${conversationId}
      `;
      const conversation = conversationResult.rows[0];

      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const quoteResult = await sql`
        SELECT * FROM quotes WHERE conversation_id = ${conversationId}
      `;
      const existingQuote = quoteResult.rows[0];

      return NextResponse.json({
        success: true,
        conversation,
        hasQuote: !!existingQuote,
        quote: existingQuote || null
      });
    }

    // If fetching all quotes for an opportunity
    if (opportunityId) {
      const quotesResult = await sql`
        SELECT * FROM quotes WHERE opportunity_id = ${opportunityId}
      `;
      return NextResponse.json({ quotes: quotesResult.rows });
    }

    return NextResponse.json(
      { success: false, error: 'Conversation ID or Opportunity ID required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error fetching quote data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch quote data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, quoteAmount, notes, arrivalDate, arrivalTime } = await request.json();

    if (!conversationId || !quoteAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get conversation data
    const conversationResult = await sql`
      SELECT * FROM conversations WHERE id = ${conversationId}
    `;
    const conversation = conversationResult.rows[0];

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if already quoted
    const existingQuoteResult = await sql`
      SELECT * FROM quotes WHERE conversation_id = ${conversationId}
    `;

    if (existingQuoteResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Quote already submitted' },
        { status: 400 }
      );
    }

    // Insert quote
    await sql`
      INSERT INTO quotes (id, conversation_id, vendor_id, opportunity_id, quote_amount, notes, arrival_date, arrival_time)
      VALUES (
        ${randomUUID()},
        ${conversationId},
        ${conversation.vendor_id},
        ${conversation.opportunity_id},
        ${quoteAmount},
        ${notes || null},
        ${arrivalDate || null},
        ${arrivalTime || null}
      )
    `;

    // Update conversation status
    await sql`
      UPDATE conversations
      SET status = 'quoted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // Add message record
    await sql`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (
        ${randomUUID()},
        ${conversationId},
        'inbound',
        'Quote Submitted',
        ${`Quote amount: $${parseFloat(quoteAmount).toLocaleString()}\n\nNotes: ${notes || 'None'}`}
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Quote submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit quote' },
      { status: 500 }
    );
  }
}
