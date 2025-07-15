// frontend/src/app/api/vehicles/route.js - FIXED WITH SIMPLIFIED IMAGE HANDLING
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
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', vehicles: [] },
        { status: 500 }
      );
    }

    // SIMPLIFIED: Process images for each vehicle
    const processedVehicles = (data || []).map(vehicle => {
      // Ensure images is always an array
      if (!vehicle.images) {
        vehicle.images = [];
      } else if (typeof vehicle.images === 'string') {
        try {
          vehicle.images = JSON.parse(vehicle.images);
        } catch (e) {
          console.warn('Failed to parse images for vehicle:', vehicle.id);
          vehicle.images = [];
        }
      }
      
      // Ensure images is array and process each image
      if (Array.isArray(vehicle.images)) {
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
        }).filter(img => img.url); // Remove images without URLs
      } else {
        vehicle.images = [];
      }
      
      return vehicle;
    });

    return NextResponse.json({ 
      vehicles: processedVehicles,
      total: processedVehicles.length 
    });
  } catch (error) {
    console.error('API error:', error);
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

    console.log('Creating vehicle with data:', vehicleData);
    console.log('Images count:', images.length);

    // Ensure storage bucket exists
    await ensureStorageBucket();

    // Upload images
    const imageUrls = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Validate image
        if (!image || !image.name || !image.type) {
          console.warn(`Invalid image at index ${i}`);
          continue;
        }
        
        if (!image.type.startsWith('image/')) {
          console.warn(`Invalid image type at index ${i}:`, image.type);
          continue;
        }
        
        const fileExt = image.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        console.log(`Uploading image ${i + 1}/${images.length}: ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false,
            contentType: image.type
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(fileName);
        
        imageUrls.push({
          url: publicUrl,
          alt: `${vehicleData.make} ${vehicleData.model} - Image ${i + 1}`,
          isPrimary: i === 0,
          fileName: fileName
        });
        
        console.log('✅ Image uploaded successfully:', fileName);
      } catch (error) {
        console.error(`Error uploading image ${i + 1}:`, error);
      }
    }

    // If no images uploaded, add fallback
    if (imageUrls.length === 0) {
      imageUrls.push({
        url: '/hero.jpg',
        alt: `${vehicleData.make} ${vehicleData.model}`,
        isPrimary: true,
        isFallback: true
      });
    }

    // Process form data
    const processedVehicleData = {
      year: parseInt(vehicleData.year),
      make: vehicleData.make,
      model: vehicleData.model,
      trim: vehicleData.trim || null,
      vin: vehicleData.vin || null,
      price: parseFloat(vehicleData.price),
      sale_price: vehicleData.sale_price ? parseFloat(vehicleData.sale_price) : null,
      mileage: parseInt(vehicleData.mileage),
      body_type: vehicleData.body_type,
      exterior_color: vehicleData.exterior_color,
      interior_color: vehicleData.interior_color || null,
      fuel_type: vehicleData.fuel_type,
      transmission: vehicleData.transmission,
      drivetrain: vehicleData.drivetrain || null,
      engine: vehicleData.engine || null,
      features: parseArrayField(vehicleData.features),
      key_features: parseArrayField(vehicleData.key_features),
      financing_available: vehicleData.financing_available === 'true',
      monthly_payment: vehicleData.monthly_payment ? parseFloat(vehicleData.monthly_payment) : null,
      stock_number: vehicleData.stock_number || `AP${Date.now().toString().slice(-6)}`,
      status: vehicleData.status || 'available',
      condition: vehicleData.condition || 'Good',
      description: vehicleData.description || null,
      carfax_available: vehicleData.carfax_available === 'true',
      carfax_url: vehicleData.carfax_url || null,
      featured: vehicleData.featured === 'true',
      accident_history: vehicleData.accident_history === 'true',
      number_of_owners: parseInt(vehicleData.number_of_owners) || 1,
      service_records: vehicleData.service_records === 'true',
      images: imageUrls,
      views: 0,
      created_at: new Date().toISOString()
    };

    console.log('Final vehicle data:', processedVehicleData);

    // Insert into database
    const { data, error } = await supabase
      .from('vehicles')
      .insert([processedVehicleData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Clean up uploaded images on error
      if (imageUrls.length > 0 && !imageUrls[0].isFallback) {
        const filenames = imageUrls.map(img => img.fileName).filter(Boolean);
        if (filenames.length > 0) {
          await supabase.storage
            .from('vehicle-images')
            .remove(filenames)
            .catch(e => console.error('Failed to clean up images:', e));
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Vehicle created successfully:', data.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function parseArrayField(field) {
  if (!field) return [];
  
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return field.split(',').map(item => item.trim()).filter(item => item);
    }
  }
  
  if (Array.isArray(field)) {
    return field;
  }
  
  return [];
}

async function ensureStorageBucket() {
  try {
    const { data: files, error: accessError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!accessError) {
      return true;
    }
    
    const { data, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800
    });
    
    if (createError && !createError.message?.includes('already exists')) {
      throw createError;
    }
    
    return true;
  } catch (error) {
    console.error('Bucket setup error:', error);
    return false;
  }
}