// frontend/src/app/api/appointments/route.js
// ENHANCED: Reliable Resend email notifications for appointment bookings
import { NextResponse } from 'next/server';

// Initialize Supabase client
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Send email via Resend API
async function sendResendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured - skipping email');
    return { success: false, error: 'RESEND_API_KEY not configured' };
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
      console.error('❌ Resend API error:', response.status, data);
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    console.log('✅ Email sent via Resend:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('❌ Resend fetch error:', error.message);
    return { success: false, error: error.message };
  }
}

// Build the shop notification email HTML
function buildShopNotificationEmail(appointment) {
  const vehicleInfo = appointment.vehicle_info
    ? `${appointment.vehicle_info.year || ''} ${appointment.vehicle_info.make || ''} ${appointment.vehicle_info.model || ''}`.trim()
    : 'Not specified';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #1e40af; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .badge { display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 12px; }
    .content { padding: 24px; }
    .detail-grid { width: 100%; border-collapse: collapse; }
    .detail-grid td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .detail-grid td:first-child { font-weight: bold; color: #4b5563; width: 40%; }
    .detail-grid td:last-child { color: #111827; }
    .message-box { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #374151; }
    .actions { padding: 16px 24px; background: #f9fafb; text-align: center; }
    .btn { display: inline-block; padding: 10px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
    .footer { padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Appointment Request</h1>
      <p>AUTO PRO REPAIRS SALES & SERVICES</p>
      <div class="badge">ACTION REQUIRED</div>
    </div>

    <div class="content">
      <h2 style="font-size: 18px; color: #111827; margin: 0 0 16px;">Customer Information</h2>
      <table class="detail-grid">
        <tr><td>Name</td><td>${appointment.name}</td></tr>
        <tr><td>Email</td><td><a href="mailto:${appointment.email}">${appointment.email}</a></td></tr>
        <tr><td>Phone</td><td><a href="tel:${appointment.phone.replace(/\D/g, '')}">${appointment.phone}</a></td></tr>
      </table>

      <h2 style="font-size: 18px; color: #111827; margin: 24px 0 16px;">Appointment Details</h2>
      <table class="detail-grid">
        <tr><td>Service</td><td><strong>${appointment.service}</strong></td></tr>
        <tr><td>Date</td><td>${appointment.date}</td></tr>
        <tr><td>Time</td><td>${appointment.time}</td></tr>
        <tr><td>Vehicle</td><td>${vehicleInfo}</td></tr>
        <tr><td>Urgency</td><td>${appointment.urgency || 'Medium'}</td></tr>
      </table>

      ${appointment.message ? `
      <h2 style="font-size: 18px; color: #111827; margin: 24px 0 16px;">Customer Message</h2>
      <div class="message-box">${appointment.message}</div>
      ` : ''}
    </div>

    <div class="actions">
      <a href="tel:${appointment.phone.replace(/\D/g, '')}" class="btn" style="color: white;">
        📞 Call Customer
      </a>
    </div>

    <div class="footer">
      <p>This notification was sent automatically when a customer booked an appointment.</p>
      <p>AUTO PRO REPAIRS SALES & SERVICES • 806 Hood Ave, Leesburg, FL 34748</p>
      <p>Submitted at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
    </div>
  </div>
</body>
</html>`;
}

// Build the customer confirmation email HTML
function buildCustomerConfirmationEmail(appointment) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #1e40af; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .check { font-size: 48px; margin-bottom: 8px; }
    .content { padding: 24px; color: #374151; font-size: 15px; line-height: 1.6; }
    .detail-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-box h3 { margin: 0 0 12px; color: #1e40af; font-size: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-label { color: #6b7280; }
    .detail-value { color: #111827; font-weight: 500; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 20px 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="check">✅</div>
      <h1>Appointment Request Received!</h1>
    </div>

    <div class="content">
      <p>Dear ${appointment.name},</p>
      <p>Thank you for choosing <strong>AUTO PRO Repairs Sales & Services</strong>! We've received your appointment request and will confirm it within 24 hours.</p>

      <div class="detail-box">
        <h3>📋 Your Appointment Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Service:</td><td style="padding: 6px 0; font-weight: 500;">${appointment.service}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Date:</td><td style="padding: 6px 0; font-weight: 500;">${appointment.date}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Time:</td><td style="padding: 6px 0; font-weight: 500;">${appointment.time}</td></tr>
        </table>
      </div>

      <p><strong>What happens next?</strong></p>
      <p>Our team will review your request and call or email you to confirm your appointment. If you need to make changes, feel free to contact us directly.</p>

      <div class="cta">
        <a href="tel:3529335181" class="btn" style="color: white;">📞 Call Us: (352) 933-5181</a>
      </div>

      <p style="font-size: 13px; color: #6b7280;">
        <strong>Business Hours:</strong><br>
        Monday - Friday: 8:00 AM - 6:00 PM<br>
        Saturday: 9:00 AM - 3:00 PM<br>
        Sunday: Closed
      </p>
    </div>

    <div class="footer">
      <p><strong>AUTO PRO REPAIRS SALES & SERVICES LLC</strong></p>
      <p>806 Hood Ave, Leesburg, FL 34748</p>
      <p>(352) 933-5181 • service@autoprorepairs.com</p>
    </div>
  </div>
</body>
</html>`;
}


// ========== POST: Create new appointment ==========
export async function POST(request) {
  try {
    console.log('🔧 Appointment API: Processing new request...');

    const body = await request.json();
    console.log('📝 Received:', { name: body.name, email: body.email, service: body.service, date: body.date });

    // Validate required fields
    const required = ['name', 'email', 'phone', 'service', 'date', 'time'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` },
          { status: 400 }
        );
      }
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Validate phone
    if (body.phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    // Build appointment data
    const appointmentData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      service: body.service.trim(),
      date: body.date,
      time: body.time,
      message: body.message?.trim() || '',
      vehicle_info: {
        year: body.vehicleYear?.trim() || null,
        make: body.vehicleMake?.trim() || null,
        model: body.vehicleModel?.trim() || null,
      },
      // Map to the DB columns that match both column sets
      appointment_date: body.date,
      appointment_time: body.time,
      customer_name: body.name.trim(),
      customer_email: body.email.trim().toLowerCase(),
      customer_phone: body.phone.trim(),
      vehicle_year: body.vehicleYear ? parseInt(body.vehicleYear) : null,
      vehicle_make: body.vehicleMake?.trim() || null,
      vehicle_model: body.vehicleModel?.trim() || null,
      notes: body.message?.trim() || '',
      status: 'pending',
      urgency: 'medium',
      confirmation_sent: false,
      reminder_sent: false,
    };

    // ---- Save to Supabase ----
    let savedAppointment = null;
    let saveMethod = 'none';

    try {
      const supabase = await getSupabase();

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error.message);
        // Don't fail - we still want to send the notification email
      } else {
        savedAppointment = data;
        saveMethod = 'supabase';
        console.log('✅ Saved to Supabase:', data.id);
      }
    } catch (dbErr) {
      console.error('❌ Database connection error:', dbErr.message);
    }

    // Generate a fallback ID if Supabase failed
    if (!savedAppointment) {
      savedAppointment = {
        ...appointmentData,
        id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      saveMethod = 'fallback';
      console.log('⚠️ Using fallback save, ID:', savedAppointment.id);
    }

    // ---- Send notification emails via Resend ----
    const emailResults = { shop: null, customer: null };

    // 1. Notify the shop
    console.log('📧 Sending shop notification email...');
    emailResults.shop = await sendResendEmail({
      to: process.env.NEXT_PUBLIC_EMAIL || 'service@autoprorepairs.com',
      subject: `🔔 New Appointment: ${appointmentData.name} - ${appointmentData.service} (${appointmentData.date})`,
      html: buildShopNotificationEmail(appointmentData),
      replyTo: appointmentData.email,
    });

    if (emailResults.shop.success) {
      console.log('✅ Shop notification sent');
    } else {
      console.error('❌ Shop notification failed:', emailResults.shop.error);
    }

    // 2. Send customer confirmation
    console.log('📧 Sending customer confirmation email...');
    emailResults.customer = await sendResendEmail({
      to: appointmentData.email,
      subject: 'Appointment Request Received - AUTO PRO Repairs & Sales',
      html: buildCustomerConfirmationEmail(appointmentData),
    });

    if (emailResults.customer.success) {
      console.log('✅ Customer confirmation sent');

      // Mark confirmation as sent in DB
      if (saveMethod === 'supabase' && savedAppointment.id) {
        try {
          const supabase = await getSupabase();
          await supabase
            .from('appointments')
            .update({ confirmation_sent: true })
            .eq('id', savedAppointment.id);
        } catch (e) {
          console.warn('⚠️ Could not update confirmation_sent flag:', e.message);
        }
      }
    } else {
      console.error('❌ Customer confirmation failed:', emailResults.customer.error);
    }

    // ---- Return success ----
    console.log('🎉 Appointment processing complete');

    return NextResponse.json({
      success: true,
      message: "Appointment request submitted successfully! We'll confirm your appointment within 24 hours.",
      appointment: {
        id: savedAppointment.id,
        name: appointmentData.name,
        date: appointmentData.date,
        time: appointmentData.time,
        service: appointmentData.service,
        status: 'pending',
      },
      notifications: {
        shopNotified: emailResults.shop?.success || false,
        customerConfirmed: emailResults.customer?.success || false,
      },
    });

  } catch (error) {
    console.error('❌ Appointment creation error:', error);

    return NextResponse.json({
      error: 'Sorry, there was a problem submitting your appointment. Please try again or call us directly at (352) 933-5181.',
    }, { status: 500 });
  }
}


// ========== GET: Fetch appointments ==========
export async function GET(request) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);

    const date = searchParams.get('date');
    if (date) {
      if (date === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('date', today);
      } else {
        query = query.eq('date', date);
      }
    }

    const limit = searchParams.get('limit');
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch appointments', appointments: [] }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('❌ Appointments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments', appointments: [] }, { status: 500 });
  }
}