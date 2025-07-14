// frontend/src/app/api/vehicles/route.js - FIXED VERSION
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    const featured = searchParams.get('featured');
    if (featured) {
      query = query.eq('featured', featured === 'true');
    }

    const make = searchParams.get('make');
    if (make && make !== 'All Makes') {
      query = query.eq('make', make);
    }

    const model = searchParams.get('model');
    if (model && model !== 'All Models') {
      query = query.eq('model', model);
    }

    const year = searchParams.get('year');
    if (year && year !== 'All Years') {
      query = query.eq('year', parseInt(year));
    }

    const minPrice = searchParams.get('minPrice');
    if (minPrice) {
      query = query.gte('price', parseInt(minPrice));
    }

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) {
      query = query.lte('price', parseInt(maxPrice));
    }

    const bodyType = searchParams.get('bodyType');
    if (bodyType) {
      query = query.eq('body_type', bodyType);
    }

    const limit = searchParams.get('limit');
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', vehicles: [] },
        { status: 500 }
      );
    }

    // FIXED: Format images properly - same logic as in supabase lib
    if (data) {
      data.forEach(vehicle => {
        if (vehicle.images && Array.isArray(vehicle.images)) {
          // Images are already in correct format
        } else if (vehicle.images && typeof vehicle.images === 'string') {
          // Convert string to array if needed
          try {
            vehicle.images = JSON.parse(vehicle.images);
          } catch (e) {
            console.warn('Failed to parse vehicle images for vehicle ID:', vehicle.id);
            vehicle.images = [];
          }
        } else {
          vehicle.images = [];
        }

        // Ensure each image object has required properties
        if (vehicle.images.length > 0) {
          vehicle.images = vehicle.images.map((img, index) => {
            if (typeof img === 'string') {
              return {
                url: img,
                alt: `${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${index + 1}`,
                isPrimary: index === 0
              };
            }
            return {
              url: img.url || img.publicUrl || '',
              alt: img.alt || `${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${index + 1}`,
              isPrimary: img.isPrimary || index === 0,
              fileName: img.fileName
            };
          });
        }
      });
    }

    return NextResponse.json({ 
      vehicles: data || [],
      total: data?.length || 0 
    });
  } catch (error) {
    console.error('Error in vehicles API:', error);
    return NextResponse.json(
      { error: 'Internal server error', vehicles: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const vehicleData = {};
    const images = [];

    // Extract form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image')) {
        images.push(value);
      } else {
        vehicleData[key] = value;
      }
    }

    // Upload images to Supabase Storage
    const imageUrls = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const fileExt = image.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log(`Uploading image ${i + 1}:`, fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        });
      
      if (uploadError) {
        console.error('Image upload error:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);
      
      imageUrls.push({
        url: publicUrl,
        alt: `${vehicleData.make} ${vehicleData.model} - Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: fileName
      });
    }

    // Parse JSON fields
    if (vehicleData.features) {
      try {
        vehicleData.features = JSON.parse(vehicleData.features);
      } catch (e) {
        vehicleData.features = vehicleData.features.split(',').map(f => f.trim()).filter(f => f);
      }
    }
    if (vehicleData.key_features) {
      try {
        vehicleData.key_features = JSON.parse(vehicleData.key_features);
      } catch (e) {
        vehicleData.key_features = vehicleData.key_features.split(',').map(f => f.trim()).filter(f => f);
      }
    }

    // Convert string values to appropriate types
    vehicleData.year = parseInt(vehicleData.year);
    vehicleData.price = parseFloat(vehicleData.price);
    vehicleData.mileage = parseInt(vehicleData.mileage);
    if (vehicleData.sale_price) {
      vehicleData.sale_price = parseFloat(vehicleData.sale_price);
    }
    if (vehicleData.monthly_payment) {
      vehicleData.monthly_payment = parseFloat(vehicleData.monthly_payment);
    }
    vehicleData.financing_available = vehicleData.financing_available === 'true';
    vehicleData.featured = vehicleData.featured === 'true';
    vehicleData.accident_history = vehicleData.accident_history === 'true';
    vehicleData.service_records = vehicleData.service_records === 'true';
    vehicleData.carfax_available = vehicleData.carfax_available === 'true';

    // Generate stock number if not provided
    if (!vehicleData.stock_number) {
      vehicleData.stock_number = `AP${Date.now().toString().slice(-6)}`;
    }

    // Add images to vehicle data
    vehicleData.images = imageUrls;
    vehicleData.views = 0;

    console.log('Final vehicle data with images:', {
      ...vehicleData,
      imagesCount: imageUrls.length
    });

    // Insert into database
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Clean up uploaded images on database error
      if (imageUrls.length > 0) {
        const filenames = imageUrls.map(img => img.fileName).filter(Boolean);
        if (filenames.length > 0) {
          await supabase.storage
            .from('vehicle-images')
            .remove(filenames);
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create vehicle' },
        { status: 500 }
      );
    }

    console.log('Vehicle created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}