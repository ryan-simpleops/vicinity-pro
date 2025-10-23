import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';
import vendorsData from '@/data/vendors.json';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, fullName, title, signature } = await request.json();

    if (!conversationId || !fullName || !title || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get conversation
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

    if (conversation.status !== 'awarded') {
      return NextResponse.json(
        { success: false, error: 'This agreement is not available for signing' },
        { status: 400 }
      );
    }

    // Get quote
    const quoteResult = await sql`
      SELECT * FROM quotes WHERE conversation_id = ${conversationId}
    `;
    const quote = quoteResult.rows[0];

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Get vendor
    const vendor = vendorsData.find((v: any) => v.id === conversation.vendor_id);
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update conversation status
    await sql`
      UPDATE conversations
      SET status = 'agreement_signed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // Record signature message
    await sql`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (
        ${randomUUID()},
        ${conversationId},
        'inbound',
        'Agreement Signed',
        ${`Agreement signed by ${fullName} (${title})`}
      )
    `;

    // Generate PO number
    const poNumber = `PO-${Date.now()}-${conversation.vendor_id}`;

    // Update status to PO issued
    await sql`
      UPDATE conversations
      SET status = 'po_issued', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // Send confirmation email to vendor with PO
    await sendEmail({
      to: conversation.vendor_email,
      subject: `Purchase Order ${poNumber} - Project Confirmed`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Agreement Confirmed!</h2>

          <p>Dear ${vendor.name} ${vendor.last_name},</p>

          <p>Thank you for signing the service agreement. Your purchase order has been generated.</p>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Purchase Order Details</h3>
            <p style="margin: 5px 0;"><strong>PO Number:</strong> ${poNumber}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${vendor.company_name}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> $${quote.quote_amount.toLocaleString()}</p>
            ${quote.arrival_date ? `<p style="margin: 5px 0;"><strong>Service Date:</strong> ${quote.arrival_date}</p>` : ''}
            ${quote.arrival_time ? `<p style="margin: 5px 0;"><strong>Service Time:</strong> ${quote.arrival_time}</p>` : ''}
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Next Steps:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review the purchase order details above</li>
              <li>Confirm your service date and arrival time</li>
              <li>Contact us if you have any questions</li>
            </ul>
          </div>

          <p>We look forward to working with you!</p>

          <p style="margin-top: 30px;">Best regards,<br/><strong>Simple Ops Team</strong><br/>ryane@trysimpleops.com</p>
        </div>
      `
    });

    // Record PO email
    await sql`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (
        ${randomUUID()},
        ${conversationId},
        'outbound',
        ${`Purchase Order ${poNumber} - Project Confirmed`},
        ${`Purchase order generated: ${poNumber}`}
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Agreement signed and PO generated',
      poNumber
    });
  } catch (error: any) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sign agreement' },
      { status: 500 }
    );
  }
}
