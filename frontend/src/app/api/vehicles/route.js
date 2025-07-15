// frontend/src/app/api/vehicles/route.js - FIXED IMAGE HANDLING
import { NextResponse } from 'next/server';
import { supabase, createVehicle } from '@/lib/supabase';

export async function GET(request) {
  try {
    console.log('🔍 API: Fetching vehicles...');
    
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
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', vehicles: [] },
        { status: 500 }
      );
    }

    // ENHANCED: Process images with detailed debugging
    const processedVehicles = (data || []).map((vehicle, vehicleIndex) => {
      console.log(`\n🚗 API: Processing vehicle ${vehicleIndex + 1}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      console.log('Raw images data:', vehicle.images);
      console.log('Raw images type:', typeof vehicle.images);
      
      // Ensure images is always an array
      let imageArray = [];
      
      if (Array.isArray(vehicle.images)) {
        imageArray = vehicle.images;
        console.log('✅ Images already an array:', imageArray.length, 'items');
      } else if (typeof vehicle.images === 'string') {
        try {
          imageArray = JSON.parse(vehicle.images);
          if (!Array.isArray(imageArray)) {
            imageArray = [imageArray];
          }
          console.log('✅ Parsed string to array:', imageArray.length, 'items');
        } catch (e) {
          console.warn(`❌ Failed to parse images for vehicle ${vehicle.id}:`, e);
          imageArray = [];
        }
      } else if (vehicle.images && typeof vehicle.images === 'object') {
        imageArray = [vehicle.images];
        console.log('✅ Converted object to array');
      } else {
        console.log('⚠️ No valid images found, will use fallback');
      }
      
      // Process each image with enhanced debugging
      const validImages = [];
      
      if (Array.isArray(imageArray) && imageArray.length > 0) {
        console.log(`📷 Processing ${imageArray.length} images...`);
        
        imageArray.forEach((img, index) => {
          console.log(`  Image ${index + 1}:`, img);
          
          let imageUrl = null;
          let alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          let isPrimary = index === 0;
          let fileName = null;
          
          if (typeof img === 'string') {
            imageUrl = img;
            console.log(`    String URL: ${imageUrl}`);
          } else if (img && typeof img === 'object') {
            imageUrl = img.url || img.publicUrl || img.src;
            alt = img.alt || alt;
            isPrimary = img.isPrimary !== undefined ? img.isPrimary : isPrimary;
            fileName = img.fileName;
            console.log(`    Object URL: ${imageUrl}`);
            console.log(`    Alt: ${alt}`);
            console.log(`    Primary: ${isPrimary}`);
          }
          
          // Enhanced URL validation with debugging
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
            const cleanedUrl = imageUrl.trim();
            console.log(`    Cleaned URL: ${cleanedUrl}`);
            
            // Check if it's a valid URL structure
            const isValidUrl = cleanedUrl.startsWith('http://') || 
                             cleanedUrl.startsWith('https://') || 
                             cleanedUrl.startsWith('/');
            
            console.log(`    Valid URL structure: ${isValidUrl}`);
            
            if (isValidUrl) {
              const imageObj = {
                url: cleanedUrl,
                alt: alt || 'Vehicle Image',
                isPrimary,
                fileName
              };
              
              validImages.push(imageObj);
              console.log(`    ✅ Added image:`, imageObj);
            } else {
              console.warn(`    ❌ Invalid URL structure:`, cleanedUrl);
            }
          } else {
            console.warn(`    ❌ No valid URL found for image ${index + 1}`);
          }
        });
      } else {
        console.log('⚠️ No images array to process');
      }
      
      // Ensure at least one image (fallback)
      if (validImages.length === 0) {
        const fallbackImage = {
          url: '/hero.jpg',
          alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          isPrimary: true,
          isFallback: true
        };
        validImages.push(fallbackImage);
        console.log(`🔄 Using fallback image for vehicle ${vehicle.id}`);
      }
      
      // Ensure at least one primary image
      if (!validImages.some(img => img.isPrimary)) {
        validImages[0].isPrimary = true;
        console.log('🔧 Set first image as primary');
      }
      
      vehicle.images = validImages;
      console.log(`✅ Final images for vehicle ${vehicle.id}:`, validImages);
      
      return vehicle;
    });

    console.log(`✅ API: Returning ${processedVehicles.length} vehicles`);
    
    return NextResponse.json({ 
      vehicles: processedVehicles,
      total: processedVehicles.length 
    });
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', vehicles: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🔨 API: Creating new vehicle...');
    
    const formData = await request.formData();
    const vehicleData = {};
    const images = [];

    // Extract form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        images.push(value);
        console.log(`📷 Found image: ${value.name} (${Math.round(value.size / 1024)}KB)`);
      } else {
        vehicleData[key] = value;
      }
    }

    console.log('📝 Vehicle data:', {
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      price: vehicleData.price,
      imageCount: images.length
    });

    // SIMPLIFIED: Process form data with better type conversion
    const processedVehicleData = {
      year: parseInt(vehicleData.year) || new Date().getFullYear(),
      make: String(vehicleData.make || '').trim(),
      model: String(vehicleData.model || '').trim(),
      trim: vehicleData.trim ? String(vehicleData.trim).trim() : null,
      vin: vehicleData.vin ? String(vehicleData.vin).trim() : null,
      price: parseFloat(vehicleData.price) || 0,
      sale_price: vehicleData.sale_price ? parseFloat(vehicleData.sale_price) : null,
      mileage: parseInt(vehicleData.mileage) || 0,
      body_type: String(vehicleData.body_type || '').trim(),
      exterior_color: String(vehicleData.exterior_color || '').trim(),
      interior_color: vehicleData.interior_color ? String(vehicleData.interior_color).trim() : null,
      fuel_type: String(vehicleData.fuel_type || '').trim(),
      transmission: String(vehicleData.transmission || '').trim(),
      drivetrain: vehicleData.drivetrain ? String(vehicleData.drivetrain).trim() : null,
      engine: vehicleData.engine ? String(vehicleData.engine).trim() : null,
      features: parseArrayField(vehicleData.features),
      key_features: parseArrayField(vehicleData.key_features),
      financing_available: vehicleData.financing_available === 'true',
      monthly_payment: vehicleData.monthly_payment ? parseFloat(vehicleData.monthly_payment) : null,
      stock_number: vehicleData.stock_number ? String(vehicleData.stock_number).trim() : `AP${Date.now().toString().slice(-6)}`,
      status: vehicleData.status || 'available',
      condition: vehicleData.condition || 'Good',
      description: vehicleData.description ? String(vehicleData.description).trim() : null,
      carfax_available: vehicleData.carfax_available === 'true',
      carfax_url: vehicleData.carfax_url ? String(vehicleData.carfax_url).trim() : null,
      featured: vehicleData.featured === 'true',
      accident_history: vehicleData.accident_history === 'true',
      number_of_owners: parseInt(vehicleData.number_of_owners) || 1,
      service_records: vehicleData.service_records === 'true'
    };

    // Validation
    const requiredFields = ['make', 'model', 'price', 'body_type', 'exterior_color', 'fuel_type', 'transmission'];
    for (const field of requiredFields) {
      if (!processedVehicleData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    console.log('✅ Processed vehicle data:', processedVehicleData);

    // Use createVehicle from supabase.js which handles all the image upload logic
    const result = await createVehicle(processedVehicleData, images);

    if (result.error) {
      console.error('❌ Vehicle creation failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: result.error.message },
        { status: 500 }
      );
    }

    console.log('✅ Vehicle created successfully:', result.data.id);
    return NextResponse.json(result.data);
    
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to parse array fields
function parseArrayField(field) {
  if (!field) return [];
  
  if (typeof field === 'string') {
    try {
      // Try parsing as JSON first
      return JSON.parse(field);
    } catch (e) {
      // Fall back to comma-separated parsing
      return field.split(',').map(item => item.trim()).filter(item => item);
    }
  }
  
  if (Array.isArray(field)) {
    return field;
  }
  
  return [];
}