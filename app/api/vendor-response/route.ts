import { NextRequest, NextResponse } from 'next/server';
import db, { initDB } from '@/lib/db/database';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';
import vendorsData from '@/data/vendors.json';

// Initialize database
initDB();

export async function POST(request: NextRequest) {
  try {
    const { vendorId, response, opportunityId, vendorEmail } = await request.json();

    // Get vendor data from JSON
    const vendor = vendorsData.find((v: any) => v.id === vendorId);
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const email = vendorEmail || vendor.email;
    const conversationId = randomUUID();

    // Check if conversation already exists
    const existingConv = db.prepare(
      'SELECT id FROM conversations WHERE vendor_id = ? AND opportunity_id = ?'
    ).get(vendorId, opportunityId) as { id: string } | undefined;

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
      // Update existing conversation status
      db.prepare(
        'UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(response === 'yes' ? 'interested' : 'not_interested', convId);
    } else {
      // Create new conversation
      convId = conversationId;
      db.prepare(`
        INSERT INTO conversations (id, vendor_id, opportunity_id, vendor_email, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(convId, vendorId, opportunityId, email, response === 'yes' ? 'interested' : 'not_interested');
    }

    // Record the response as a message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, direction, subject, message_body)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      convId,
      'inbound',
      response === 'yes' ? 'Interested in Opportunity' : 'Declined Opportunity',
      response === 'yes'
        ? 'Vendor clicked "Yes, I\'m Interested" button'
        : 'Vendor clicked "No, Thanks" button'
    );

    // If vendor said yes, send them the bid request form
    if (response === 'yes') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const quoteUrl = `${baseUrl}/quote/${convId}`;

      await sendEmail({
        to: email,
        subject: 'Bid Request Form - Submit Your Quote',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${vendor.name} ${vendor.last_name},</h2>

            <p>Thank you for your interest in this opportunity! We're excited to receive your quote for this project.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #555;">Next Steps:</h3>
              <p>Please click the button below to access the bid request form and submit your quote.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${quoteUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Submit Your Quote
              </a>
            </div>

            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              This link will take you to a form where you can provide your quote amount and any additional notes about your bid.
            </p>

            <p style="margin-top: 30px;">Best regards,<br/><strong>Simple Ops Team</strong><br/>ryane@trysimpleops.com</p>
          </div>
        `
      });

      // Record the bid request email as an outbound message
      db.prepare(`
        INSERT INTO messages (id, conversation_id, direction, subject, message_body)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        convId,
        'outbound',
        'Bid Request Form - Submit Your Quote',
        `Sent bid request form link: ${quoteUrl}`
      );

      return NextResponse.json({
        success: true,
        message: 'Thank you for your interest! Check your email for the bid request form.'
      });
    } else {
      // Vendor declined
      return NextResponse.json({
        success: true,
        message: 'Thank you for your response. We\'ll keep you in mind for future opportunities.'
      });
    }
  } catch (error: any) {
    console.error('Error handling vendor response:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process response' },
      { status: 500 }
    );
  }
}
