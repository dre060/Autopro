// frontend/src/app/api/contact/route.js
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send to backend API
    const response = await fetch(`${API_BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        to: 'service@autoprorepairs.com',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // For development without backend, simulate success
    if (process.env.NODE_ENV === 'development' && response.status === 404) {
      console.log('Contact form submission:', body);
      return NextResponse.json({ 
        success: true, 
        message: 'Message sent successfully' 
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Contact form error:', error);
    
    // In development, still return success to test the form
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        success: true, 
        message: 'Message sent successfully (dev mode)' 
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}