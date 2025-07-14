// frontend/src/app/api/vehicles/[id]/featured/route.js
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function PATCH(request, { params }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles/${params.id}/featured`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to update featured status');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    );
  }
}