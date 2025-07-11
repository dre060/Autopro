// frontend/src/app/api/auth/login/route.js
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // For production, implement proper authentication with your backend
    // This is a simple example
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Login error:', error);
    
    // For development/demo purposes only
    // Remove this in production and use proper authentication
    if (process.env.NODE_ENV === 'development') {
      const { email, password } = await request.json();
      if (email === 'admin@autopro.com' && password === 'autopro2025') {
        return NextResponse.json({ 
          success: true, 
          token: 'demo-token',
          message: 'Login successful' 
        });
      }
    }
    
    return NextResponse.json(
      { message: 'Authentication service unavailable' },
      { status: 503 }
    );
  }
}