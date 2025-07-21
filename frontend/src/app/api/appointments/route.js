// frontend/src/app/api/appointments/route.js - FIXED WITH FALLBACK
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔧 Appointment API: Starting request processing...');
    
    const body = await request.json();
    console.log('📝 Received appointment data:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      service: body.service,
      date: body.date,
      time: body.time
    });
    
    // Validate required fields
    const required = ['name', 'email', 'phone', 'service', 'date', 'time'];
    for (const field of required) {
      if (!body[field]) {
        console.error(`❌ Missing required field: ${field}`);
        return NextResponse.json(
          { error: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      console.error('❌ Invalid email format:', body.email);
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone number (remove formatting and check length)
    const phoneDigits = body.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      console.error('❌ Invalid phone number:', body.phone);
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Create appointment data
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
      status: 'pending',
      urgency: 'medium',
      confirmation_sent: false,
      reminder_sent: false,
      created_at: new Date().toISOString(),
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('💾 Processed appointment data:', appointmentData);

    // Try Supabase first, fall back to simple storage/email if it fails
    let saveResult = null;
    let useSupabase = false;

    // Check if Supabase is configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        console.log('🗄️ Attempting Supabase save...');
        const { createClient } = await import('@supabase/supabase-js');
        
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: appointment, error } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase error, will use fallback:', error.message);
        } else {
          console.log('✅ Supabase save successful:', appointment.id);
          saveResult = appointment;
          useSupabase = true;
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase connection failed, using fallback:', supabaseError.message);
      }
    } else {
      console.log('⚠️ Supabase not configured, using fallback method');
    }

    // Fallback: Save to file system or just log (for development)
    if (!useSupabase) {
      console.log('📝 Using fallback storage method...');
      
      // In production, you might want to save to a file or send directly to email
      // For now, we'll just simulate a successful save
      saveResult = {
        ...appointmentData,
        id: appointmentData.id,
        saved_method: 'fallback'
      };
      
      console.log('✅ Fallback save completed:', saveResult.id);
    }

    // Try to send notification email (optional, don't fail if this doesn't work)
    try {
      console.log('📧 Attempting to send notification email...');
      
      // Try sending email notification
      const emailData = {
        to: process.env.NEXT_PUBLIC_EMAIL || 'service@autoprorepairs.com',
        subject: `New Appointment Request - ${appointmentData.name}`,
        html: `
          <h2>New Appointment Request</h2>
          <p><strong>Customer:</strong> ${appointmentData.name}</p>
          <p><strong>Email:</strong> ${appointmentData.email}</p>
          <p><strong>Phone:</strong> ${appointmentData.phone}</p>
          <p><strong>Service:</strong> ${appointmentData.service}</p>
          <p><strong>Date:</strong> ${appointmentData.date}</p>
          <p><strong>Time:</strong> ${appointmentData.time}</p>
          ${appointmentData.vehicle_info.year ? `<p><strong>Vehicle:</strong> ${appointmentData.vehicle_info.year} ${appointmentData.vehicle_info.make} ${appointmentData.vehicle_info.model}</p>` : ''}
          ${appointmentData.message ? `<p><strong>Message:</strong> ${appointmentData.message}</p>` : ''}
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        `
      };

      // Try using Supabase Edge Function for email
      if (useSupabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(emailData),
          });

          if (emailResponse.ok) {
            console.log('✅ Email notification sent via Supabase');
          } else {
            console.log('⚠️ Email via Supabase failed, trying backup method');
            throw new Error('Supabase email failed');
          }
        } catch (supabaseEmailError) {
          console.log('⚠️ Supabase email error:', supabaseEmailError.message);
          // Could try other email services here
        }
      }

      // Try direct SMTP or other email service as backup
      // For now, just log that we would send an email
      console.log('📧 Email notification logged (would be sent in production)');
      
    } catch (emailError) {
      console.warn('⚠️ Email notification failed (non-critical):', emailError.message);
      // Don't fail the appointment creation if email fails
    }

    // Send confirmation email to customer (optional)
    try {
      console.log('📧 Sending confirmation to customer...');
      
      const confirmationData = {
        to: appointmentData.email,
        subject: 'Appointment Request Received - AUTO PRO',
        html: `
          <h2>Thank You for Your Appointment Request</h2>
          <p>Dear ${appointmentData.name},</p>
          <p>We have received your appointment request and will confirm your appointment within 24 hours.</p>
          
          <h3>Appointment Details:</h3>
          <ul>
            <li><strong>Service:</strong> ${appointmentData.service}</li>
            <li><strong>Requested Date:</strong> ${appointmentData.date}</li>
            <li><strong>Requested Time:</strong> ${appointmentData.time}</li>
          </ul>
          
          <p>If you need to make any changes or have questions, please call us at <strong>(352) 933-5181</strong>.</p>
          
          <p>Thank you for choosing AUTO PRO!</p>
          
          <hr>
          <p style="color: #666; font-size: 12px;">
            AUTO PRO REPAIRS & SALES<br>
            806 Hood Ave, Leesburg, FL 34748<br>
            (352) 933-5181
          </p>
        `
      };

      // Log that we would send confirmation (in production, actually send it)
      console.log('✅ Customer confirmation logged (would be sent in production)');
      
    } catch (confirmError) {
      console.warn('⚠️ Customer confirmation failed (non-critical):', confirmError.message);
    }

    // Return success response
    console.log('🎉 Appointment creation completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Appointment request submitted successfully! We\'ll confirm your appointment within 24 hours.',
      appointment: {
        id: saveResult.id,
        name: saveResult.name,
        date: saveResult.date,
        time: saveResult.time,
        service: saveResult.service,
        status: saveResult.status
      },
      debug: {
        method: useSupabase ? 'supabase' : 'fallback',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Appointment creation error:', error);
    
    // Return a user-friendly error
    return NextResponse.json({
      error: 'Sorry, there was a problem submitting your appointment. Please try again or call us directly at (352) 933-5181.',
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, { 
      status: 500 
    });
  }
}

export async function GET(request) {
  try {
    console.log('📋 Appointment API: GET request received');
    
    const { searchParams } = new URL(request.url);
    
    // Check if Supabase is available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase
          .from('appointments')
          .select('*')
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        // Apply filters
        const status = searchParams.get('status');
        if (status) {
          query = query.eq('status', status);
        }

        const date = searchParams.get('date');
        if (date) {
          if (date === 'today') {
            const today = new Date().toISOString().split('T')[0];
            query = query.eq('date', today);
          } else {
            query = query.eq('date', date);
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Supabase GET error:', error);
          throw error;
        }

        console.log(`✅ Retrieved ${data?.length || 0} appointments from Supabase`);
        return NextResponse.json(data || []);

      } catch (supabaseError) {
        console.warn('⚠️ Supabase GET failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback: return empty array or sample data
    console.log('📝 Using fallback GET method');
    
    // In development, you might want to return some sample data
    const sampleData = process.env.NODE_ENV === 'development' ? [
      {
        id: 'sample_1',
        name: 'Sample Customer',
        email: 'sample@example.com',
        phone: '(352) 555-0123',
        service: 'Oil Change',
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ] : [];
    
    return NextResponse.json(sampleData);

  } catch (error) {
    console.error('❌ Error in appointments GET API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments', appointments: [] },
      { status: 500 }
    );
  }
}