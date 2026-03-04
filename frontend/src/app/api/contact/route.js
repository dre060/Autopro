// frontend/src/app/api/contact/route.js
// ENHANCED: Resend email integration for contact form submissions
import { NextResponse } from 'next/server';

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function sendResendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AUTO PRO Repairs <noreply@autoprorepairs.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save to Supabase
    try {
      const supabase = await getSupabase();
      await supabase.from('contact_messages').insert([{
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        subject: body.subject.trim(),
        message: body.message.trim(),
        responded: false,
      }]);
      console.log('✅ Contact message saved to database');
    } catch (dbErr) {
      console.error('⚠️ DB save failed (non-critical):', dbErr.message);
    }

    // Send notification email to shop via Resend
    const emailResult = await sendResendEmail({
      to: process.env.NEXT_PUBLIC_EMAIL || 'service@autoprorepairs.com',
      subject: `📧 Contact Form: ${body.subject} - from ${body.name}`,
      replyTo: body.email,
      html: `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: #7c3aed; color: white; padding: 24px; text-align: center; }
  .content { padding: 24px; }
  .detail td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .detail td:first-child { font-weight: bold; color: #4b5563; width: 30%; }
  .msg-box { background: #f9fafb; border-left: 4px solid #7c3aed; padding: 16px; margin: 16px 0; white-space: pre-wrap; }
  .footer { padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:22px;">📧 New Contact Message</h1>
      <p style="margin:8px 0 0;opacity:0.9;">AUTO PRO REPAIRS SALES & SERVICES</p>
    </div>
    <div class="content">
      <table class="detail" style="width:100%;border-collapse:collapse;">
        <tr><td>From</td><td>${body.name}</td></tr>
        <tr><td>Email</td><td><a href="mailto:${body.email}">${body.email}</a></td></tr>
        ${body.phone ? `<tr><td>Phone</td><td><a href="tel:${body.phone.replace(/\D/g, '')}">${body.phone}</a></td></tr>` : ''}
        <tr><td>Subject</td><td><strong>${body.subject}</strong></td></tr>
      </table>
      <h3 style="margin:24px 0 12px;">Message:</h3>
      <div class="msg-box">${body.message}</div>
      <p style="text-align:center;margin-top:24px;">
        <a href="mailto:${body.email}?subject=Re: ${encodeURIComponent(body.subject)}" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reply to Customer</a>
      </p>
    </div>
    <div class="footer">
      <p>Received: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
    </div>
  </div>
</body>
</html>`,
    });

    if (emailResult.success) {
      console.log('✅ Contact notification email sent');
    } else {
      console.error('❌ Contact email failed:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please call us at (352) 933-5181.' }, { status: 500 });
  }
}