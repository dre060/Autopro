// frontend/src/app/api/appointments/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ['name', 'email', 'phone', 'service', 'date', 'time'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create appointment data
    const appointmentData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      service: body.service,
      date: body.date,
      time: body.time,
      message: body.message || '',
      vehicle_info: {
        year: body.vehicleYear || null,
        make: body.vehicleMake || null,
        model: body.vehicleModel || null,
      },
      status: 'pending',
      urgency: 'medium',
      confirmation_sent: false,
      reminder_sent: false,
    };

    // Insert appointment into database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    // Send email notification to service@autoprorepairs.com
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-appointment-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ appointment }),
      });

      if (!emailResponse.ok) {
        console.error('Email notification failed:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the appointment creation if email fails
    }

    // Send confirmation email to customer
    try {
      const confirmationResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ appointment }),
      });

      if (confirmationResponse.ok) {
        // Update appointment to mark confirmation as sent
        await supabase
          .from('appointments')
          .update({ confirmation_sent: true })
          .eq('id', appointment.id);
      }
    } catch (confirmError) {
      console.error('Confirmation email error:', confirmError);
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment,
    });
  } catch (error) {
    console.error('Appointment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
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
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments', appointments: [] },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in appointments API:', error);
    return NextResponse.json(
      { error: 'Internal server error', appointments: [] },
      { status: 500 }
    );
  }
}