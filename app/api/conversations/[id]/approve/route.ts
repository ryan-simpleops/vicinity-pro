import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db/database';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';
import vendorsData from '@/data/vendors.json';

initDB();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { opportunityId } = await request.json();

    // Get conversation
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get quote
    const quote = db.prepare('SELECT * FROM quotes WHERE conversation_id = ?').get(conversationId) as any;

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'No quote found for this conversation' },
        { status: 404 }
      );
    }

    // Get vendor info
    const vendor = vendorsData.find((v: any) => v.id === conversation.vendor_id);
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update conversation status to awarded
    db.prepare(
      'UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('awarded', conversationId);

    // Create agreement token (same as conversation ID for simplicity)
    const agreementToken = conversationId;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const agreementUrl = `${baseUrl}/agreement/${agreementToken}`;

    // Send agreement email to awarded vendor
    await sendEmail({
      to: conversation.vendor_email,
      subject: 'Congratulations! Your Bid Has Been Accepted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Congratulations ${vendor.name} ${vendor.last_name}!</h2>

          <p>We're pleased to inform you that your bid has been <strong>accepted</strong> for our project.</p>

          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Your Accepted Bid:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #065f46; margin: 10px 0;">
              $${quote.quote_amount.toLocaleString()}
            </p>
            ${quote.arrival_date ? `<p><strong>Arrival Date:</strong> ${quote.arrival_date}</p>` : ''}
            ${quote.arrival_time ? `<p><strong>Arrival Time:</strong> ${quote.arrival_time}</p>` : ''}
          </div>

          <h3 style="color: #555;">Next Steps:</h3>
          <p>Please review and sign the service agreement to proceed with the project.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${agreementUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Review & Sign Agreement
            </a>
          </div>

          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact us.
          </p>

          <p style="margin-top: 30px;">Best regards,<br/><strong>Simple Ops Team</strong><br/>ryane@trysimpleops.com</p>
        </div>
      `
    });

    // Record message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      conversationId,
      'outbound',
      'Congratulations! Your Bid Has Been Accepted',
      `Sent agreement link: ${agreementUrl}`
    );

    // Send rejection emails to all other vendors who quoted
    const otherQuotedConversations = db.prepare(`
      SELECT c.*, q.quote_amount
      FROM conversations c
      INNER JOIN quotes q ON c.id = q.conversation_id
      WHERE c.opportunity_id = ? AND c.id != ? AND c.status = 'quoted'
    `).all(opportunityId, conversationId) as any[];

    for (const otherConv of otherQuotedConversations) {
      const otherVendor = vendorsData.find((v: any) => v.id === otherConv.vendor_id);
      if (!otherVendor) continue;

      // Update status to declined
      db.prepare(
        'UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run('declined', otherConv.id);

      // Send rejection email
      await sendEmail({
        to: otherConv.vendor_email,
        subject: 'Update on Your Bid Submission',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${otherVendor.name} ${otherVendor.last_name},</h2>

            <p>Thank you for taking the time to submit a bid for our recent project opportunity.</p>

            <p>After careful consideration of all proposals, we have decided to move forward with another vendor for this particular project.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;">We appreciate your interest and the effort you put into your proposal. We value our relationship with ${otherVendor.company_name} and look forward to working with you on future opportunities.</p>
            </div>

            <p>We'll keep your information on file and will reach out when we have projects that match your expertise.</p>

            <p style="margin-top: 30px;">Best regards,<br/><strong>Simple Ops Team</strong><br/>ryane@trysimpleops.com</p>
          </div>
        `
      });

      // Record rejection message
      db.prepare(`
        INSERT INTO messages (id, conversation_id, direction, subject, message_body)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        otherConv.id,
        'outbound',
        'Update on Your Bid Submission',
        'Vendor was not selected for this opportunity'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Quote approved and emails sent',
      rejectedCount: otherQuotedConversations.length
    });
  } catch (error: any) {
    console.error('Error approving quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve quote' },
      { status: 500 }
    );
  }
}
