// supabase/functions/send-appointment-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AppointmentData {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  time: string
  vehicle_info?: {
    year?: number
    make?: string
    model?: string
  }
  message?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
    
    // Get the appointment data from the request
    const { appointment }: { appointment: AppointmentData } = await req.json()

    // Format the email content
    const vehicleInfo = appointment.vehicle_info 
      ? `${appointment.vehicle_info.year || ''} ${appointment.vehicle_info.make || ''} ${appointment.vehicle_info.model || ''}`.trim()
      : 'Not specified'

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f3f4f6; padding: 20px; margin-top: 20px; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; color: #4b5563; }
            .value { color: #1f2937; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Appointment Request</h1>
              <p>AUTO PRO REPAIRS SALES & SERVICES</p>
            </div>
            
            <div class="content">
              <h2>Appointment Details</h2>
              
              <div class="detail">
                <span class="label">Customer Name:</span>
                <span class="value">${appointment.name}</span>
              </div>
              
              <div class="detail">
                <span class="label">Email:</span>
                <span class="value">${appointment.email}</span>
              </div>
              
              <div class="detail">
                <span class="label">Phone:</span>
                <span class="value">${appointment.phone}</span>
              </div>
              
              <div class="detail">
                <span class="label">Service Requested:</span>
                <span class="value">${appointment.service}</span>
              </div>
              
              <div class="detail">
                <span class="label">Preferred Date:</span>
                <span class="value">${appointment.date}</span>
              </div>
              
              <div class="detail">
                <span class="label">Preferred Time:</span>
                <span class="value">${appointment.time}</span>
              </div>
              
              <div class="detail">
                <span class="label">Vehicle:</span>
                <span class="value">${vehicleInfo}</span>
              </div>
              
              ${appointment.message ? `
              <div class="detail">
                <span class="label">Additional Message:</span>
                <span class="value">${appointment.message}</span>
              </div>
              ` : ''}
              
              <a href="${SUPABASE_URL}/admin/appointments" class="button">View in Admin Panel</a>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from AUTO PRO REPAIRS SALES & SERVICES</p>
              <p>806 Hood Ave, Leesburg, FL 34748 | (352) 933-5181</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AUTO PRO Appointments <noreply@autoprorepairs.com>',
        to: ['service@autoprorepairs.com'],
        subject: `New Appointment Request - ${appointment.name} - ${appointment.date}`,
        html: emailHtml,
        text: `
New Appointment Request

Customer: ${appointment.name}
Email: ${appointment.email}
Phone: ${appointment.phone}
Service: ${appointment.service}
Date: ${appointment.date}
Time: ${appointment.time}
Vehicle: ${vehicleInfo}
${appointment.message ? `Message: ${appointment.message}` : ''}
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})