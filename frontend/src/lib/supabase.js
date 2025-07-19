// frontend/src/lib/supabase.js - FIXED IMAGE HANDLING
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'autopro-frontend'
    }
  }
});

// FIXED: Much simpler and more permissive URL validation
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const cleanUrl = url.trim();
  
  // Accept any HTTP/HTTPS URL or relative path
  return cleanUrl.startsWith('http://') || 
         cleanUrl.startsWith('https://') || 
         cleanUrl.startsWith('/');
};

// FIXED: Minimal URL processing - only fix obvious issues
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const cleanUrl = url.trim();
  
  if (!isValidImageUrl(cleanUrl)) {
    return null;
  }
  
  // Only fix obvious issues without over-processing
  let finalUrl = cleanUrl;
  
  // Ensure HTTPS for Supabase URLs
  if (finalUrl.includes('supabase.co') && finalUrl.startsWith('http://')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }
  
  return finalUrl;
};

// FIXED: Greatly simplified image processing
const processVehicleImages = (vehicle) => {
  console.log(`🔍 Processing images for vehicle: ${vehicle?.id} (${vehicle?.year} ${vehicle?.make} ${vehicle?.model})`);
  
  if (!vehicle?.images) {
    console.log('⚠️ No images field found');
    return [getFallbackImage(vehicle)];
  }

  let imageArray = [];

  // Handle different storage formats with minimal processing
  if (Array.isArray(vehicle.images)) {
    imageArray = vehicle.images;
    console.log(`✅ Images is array with ${imageArray.length} items`);
  } else if (typeof vehicle.images === 'string') {
    try {
      const parsed = JSON.parse(vehicle.images);
      imageArray = Array.isArray(parsed) ? parsed : [parsed];
      console.log(`✅ Parsed JSON string to array with ${imageArray.length} items`);
    } catch (e) {
      console.warn('❌ JSON parse failed, treating as single URL:', vehicle.images);
      // Try treating the string as a direct URL
      imageArray = [vehicle.images];
    }
  } else if (typeof vehicle.images === 'object' && vehicle.images !== null) {
    imageArray = [vehicle.images];
    console.log('✅ Converted object to array');
  } else {
    console.log('❌ Unknown image format');
    return [getFallbackImage(vehicle)];
  }

  const validImages = [];

  // Process each image with minimal validation
  imageArray.forEach((img, index) => {
    if (!img) {
      console.log(`⚠️ Image ${index + 1}: Empty/null image`);
      return;
    }

    let imageUrl = null;
    let alt = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image';
    let isPrimary = index === 0;
    let fileName = null;

    // Extract URL based on input type
    if (typeof img === 'string') {
      imageUrl = img.trim();
      console.log(`📷 Image ${index + 1}: String URL = ${imageUrl}`);
    } else if (img && typeof img === 'object') {
      imageUrl = (img.url || img.publicUrl || img.src || '').trim();
      alt = img.alt || alt;
      isPrimary = img.isPrimary !== undefined ? img.isPrimary : isPrimary;
      fileName = img.fileName || null;
      console.log(`📷 Image ${index + 1}: Object URL = ${imageUrl}, Primary = ${isPrimary}`);
    }

    // CRITICAL: Be very permissive with URL validation
    if (imageUrl && 
        imageUrl !== '' && 
        imageUrl !== 'null' && 
        imageUrl !== 'undefined' &&
        isValidImageUrl(imageUrl)) {
      
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl) {
        validImages.push({
          url: cleanedUrl,
          alt: alt || 'Vehicle Image',
          isPrimary,
          fileName
        });
        console.log(`✅ Added image ${index + 1}: ${cleanedUrl}`);
      } else {
        console.log(`❌ Image ${index + 1}: URL cleaning failed for ${imageUrl}`);
      }
    } else {
      console.log(`❌ Image ${index + 1}: Invalid URL format: ${imageUrl}`);
    }
  });

  // Use fallback if no valid images found
  if (validImages.length === 0) {
    console.log('🔄 No valid images found, using fallback');
    return [getFallbackImage(vehicle)];
  }

  // Ensure at least one primary image
  if (!validImages.some(img => img.isPrimary)) {
    validImages[0].isPrimary = true;
    console.log('🔧 Set first image as primary');
  }

  console.log(`✅ Final result: ${validImages.length} valid images for vehicle ${vehicle.id}`);
  validImages.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.url} (Primary: ${img.isPrimary})`);
  });

  return validImages;
};

// Fallback image generator
const getFallbackImage = (vehicle) => {
  const alt = vehicle ? 
    `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image' :
    'Vehicle Image';
    
  return {
    url: '/hero.jpg',
    alt,
    isPrimary: true,
    isFallback: true
  };
};

// Simple filename generation
const generateCleanFilename = (originalName = '', vehicleId = '') => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = validExtensions.includes(ext) ? ext : 'jpg';
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const vehiclePrefix = vehicleId ? vehicleId.substring(0, 6) : 'auto';
  
  return `${vehiclePrefix}-${timestamp}-${randomId}.${fileExt}`;
};

// FIXED: Upload images with better error handling
export const uploadVehicleImages = async (images) => {
  console.log('🚀 UPLOAD START:', images?.length || 0, 'images');
  
  if (!images || images.length === 0) {
    console.log('⚠️ No images provided');
    return { data: [], error: null };
  }

  // Ensure bucket exists
  const bucketResult = await ensureStorageBucket();
  if (!bucketResult.success) {
    console.error('❌ BUCKET ERROR:', bucketResult.error);
    return { data: [], error: { message: bucketResult.error } };
  }
  console.log('✅ BUCKET OK');

  const imageUrls = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      console.log(`📤 UPLOAD ${i + 1}/${images.length}: ${image.name} (${Math.round(image.size / 1024)}KB)`);
      
      // Validation
      if (!image || !image.name || !image.type || !image.type.startsWith('image/')) {
        throw new Error('Invalid image file');
      }
      
      if (image.size > 50 * 1024 * 1024) {
        throw new Error('Image too large (max 50MB)');
      }
      
      const fileName = generateCleanFilename(image.name);
      console.log(`📁 Generated filename: ${fileName}`);
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error(`❌ Upload failed for ${fileName}:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log(`✅ Upload successful:`, uploadData.path);
      
      // Generate public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(uploadData.path);
      
      console.log(`🔗 Generated URL: ${publicUrl}`);
      
      // MINIMAL URL validation - don't test accessibility here
      if (!publicUrl || !publicUrl.includes('supabase.co')) {
        throw new Error('Invalid public URL generated');
      }
      
      const imageObject = {
        url: publicUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path
      };
      
      imageUrls.push(imageObject);
      console.log(`✅ Processed image ${i + 1}:`, imageObject);
      
    } catch (error) {
      console.error(`❌ Error processing image ${i + 1}:`, error);
      errors.push({
        file: image.name || `Image ${i + 1}`,
        error: error.message
      });
    }
  }

  console.log(`🏁 UPLOAD COMPLETE: ${imageUrls.length} successful, ${errors.length} errors`);
  
  return { 
    data: imageUrls, 
    error: errors.length > 0 ? { partial: true, errors } : null 
  };
};

// Enhanced bucket setup
export const ensureStorageBucket = async () => {
  try {
    console.log('🪣 Checking storage bucket...');
    
    // Test bucket access
    const { data: files, error: listError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!listError) {
      console.log('✅ Bucket exists and is accessible');
      return { success: true, message: 'Bucket exists and accessible' };
    }
    
    // Create bucket if needed
    console.log('🔨 Creating bucket...');
    
    const { data: bucketData, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      if (createError.message?.includes('already exists')) {
        console.log('✅ Bucket already exists');
        return { success: true, message: 'Bucket already exists' };
      }
      console.error('❌ Bucket creation failed:', createError);
      return { success: false, error: createError.message };
    }
    
    console.log('✅ Bucket created successfully');
    return { success: true, message: 'Bucket created successfully' };
    
  } catch (error) {
    console.error('❌ Bucket setup error:', error);
    return { success: false, error: error.message };
  }
};

// FIXED: Get vehicles with proper image processing
export const getVehicles = async (filters = {}) => {
  console.log('🔍 Fetching vehicles with filters:', filters);
  
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.featured !== undefined) query = query.eq('featured', filters.featured);
  if (filters.make) query = query.eq('make', filters.make);
  if (filters.model) query = query.eq('model', filters.model);
  if (filters.year) query = query.eq('year', filters.year);
  if (filters.minPrice) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Database error:', error);
    return { data: null, error };
  }
  
  // Process images for each vehicle
  if (data && Array.isArray(data)) {
    console.log(`📊 Processing images for ${data.length} vehicles`);
    data.forEach((vehicle, index) => {
      console.log(`\n🚗 Vehicle ${index + 1}: ${vehicle.year} ${vehicle.make} ${vehicle.model} (ID: ${vehicle.id})`);
      vehicle.images = processVehicleImages(vehicle);
    });
  }
  
  console.log(`✅ Returning ${data?.length || 0} processed vehicles`);
  return { data, error };
};

// Get vehicle by ID
export const getVehicleById = async (id) => {
  console.log('🔍 Fetching vehicle by ID:', id);
  
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('❌ Database error:', error);
    return { data: null, error };
  }
  
  if (data) {
    console.log(`🚗 Processing images for vehicle: ${data.year} ${data.make} ${data.model}`);
    data.images = processVehicleImages(data);
  }
  
  // Increment views
  if (data && !error) {
    supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('⚠️ Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// FIXED: Create vehicle with simplified processing
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('🔨 Creating vehicle with', images.length, 'images');
    console.log('📝 Vehicle data:', {
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      price: vehicleData.price
    });
    
    // Upload images first
    let imageUrls = [];
    
    if (images && images.length > 0) {
      console.log('📤 Starting image upload...');
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message}`);
      }
      
      imageUrls = uploadResult.data || [];
      console.log(`📷 Upload completed: ${imageUrls.length} images processed`);
      
      if (uploadResult.error && uploadResult.error.partial) {
        console.warn('⚠️ Some images failed to upload:', uploadResult.error.errors);
      }
    }
    
    // Use fallback if no images uploaded
    if (imageUrls.length === 0) {
      console.log('🔄 No images uploaded, using fallback');
      imageUrls = [getFallbackImage(vehicleData)];
    }

    // Prepare vehicle data with proper type conversion
    const finalVehicleData = {
      year: parseInt(vehicleData.year),
      make: vehicleData.make.trim(),
      model: vehicleData.model.trim(),
      trim: vehicleData.trim?.trim() || null,
      vin: vehicleData.vin?.trim() || null,
      price: parseFloat(vehicleData.price),
      sale_price: vehicleData.sale_price ? parseFloat(vehicleData.sale_price) : null,
      mileage: parseInt(vehicleData.mileage),
      body_type: vehicleData.body_type.trim(),
      exterior_color: vehicleData.exterior_color.trim(),
      interior_color: vehicleData.interior_color?.trim() || null,
      fuel_type: vehicleData.fuel_type.trim(),
      transmission: vehicleData.transmission.trim(),
      drivetrain: vehicleData.drivetrain?.trim() || null,
      engine: vehicleData.engine?.trim() || null,
      features: Array.isArray(vehicleData.features) ? vehicleData.features : [],
      key_features: Array.isArray(vehicleData.key_features) ? vehicleData.key_features : [],
      financing_available: Boolean(vehicleData.financing_available),
      monthly_payment: vehicleData.monthly_payment ? parseFloat(vehicleData.monthly_payment) : null,
      stock_number: vehicleData.stock_number?.trim() || `AP${Date.now().toString().slice(-6)}`,
      status: vehicleData.status || 'available',
      condition: vehicleData.condition || 'Good',
      description: vehicleData.description?.trim() || null,
      carfax_available: Boolean(vehicleData.carfax_available),
      carfax_url: vehicleData.carfax_url?.trim() || null,
      featured: Boolean(vehicleData.featured),
      accident_history: Boolean(vehicleData.accident_history),
      number_of_owners: parseInt(vehicleData.number_of_owners) || 1,
      service_records: Boolean(vehicleData.service_records),
      images: imageUrls,
      views: 0,
      created_at: new Date().toISOString()
    };

    console.log('💾 Saving vehicle to database...');
    console.log('📷 Final image data:', finalVehicleData.images);

    // Insert into database
    const { data, error } = await supabase
      .from('vehicles')
      .insert([finalVehicleData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      
      // Cleanup uploaded images on failure
      if (imageUrls.length > 0 && !imageUrls[0].isFallback) {
        const filenames = imageUrls.map(img => img.fileName).filter(Boolean);
        if (filenames.length > 0) {
          supabase.storage
            .from('vehicle-images')
            .remove(filenames)
            .catch(e => console.error('⚠️ Cleanup failed:', e));
        }
      }
      
      throw error;
    }

    console.log('✅ Vehicle created successfully:', data.id);
    
    // Process images for consistent format
    if (data) {
      data.images = processVehicleImages(data);
    }
    
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ createVehicle error:', error);
    return { data: null, error };
  }
};

// Update vehicle
export const updateVehicle = async (id, updates, newImages = []) => {
  try {
    console.log(`🔄 Updating vehicle ${id}`);
    
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    let imageUrls = processVehicleImages(existingVehicle);
    
    // Handle new images
    if (newImages && newImages.length > 0) {
      console.log('📤 Uploading new images...');
      
      const uploadResult = await uploadVehicleImages(newImages);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message}`);
      }
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        imageUrls = uploadResult.data;
        console.log('✅ Replaced images with new uploads');
      }
    }
    
    // Prepare update data
    const updateData = {
      ...updates,
      images: imageUrls,
      updated_at: new Date().toISOString()
    };

    // Convert numeric fields
    if (updateData.year !== undefined) updateData.year = parseInt(updateData.year);
    if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
    if (updateData.sale_price !== undefined) updateData.sale_price = updateData.sale_price ? parseFloat(updateData.sale_price) : null;
    if (updateData.mileage !== undefined) updateData.mileage = parseInt(updateData.mileage);
    if (updateData.monthly_payment !== undefined) updateData.monthly_payment = updateData.monthly_payment ? parseFloat(updateData.monthly_payment) : null;
    if (updateData.number_of_owners !== undefined) updateData.number_of_owners = parseInt(updateData.number_of_owners);

    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Process images for consistent format
    if (data) {
      data.images = processVehicleImages(data);
    }

    console.log('✅ Vehicle updated successfully');
    return { data, error };
    
  } catch (error) {
    console.error('❌ updateVehicle error:', error);
    return { data: null, error };
  }
};

// FIXED: Simple image URL getter
export const getImageUrl = (vehicle, fallback = "/hero.jpg") => {
  if (!vehicle) return fallback;
  
  const images = vehicle.images || [];
  
  if (images.length === 0) {
    return fallback;
  }

  // Find primary image or use first
  const primaryImage = images.find(img => img?.isPrimary) || images[0];
  
  if (!primaryImage) {
    return fallback;
  }

  // Return URL directly
  if (typeof primaryImage === 'string') {
    return primaryImage || fallback;
  }

  // Extract URL from object
  const url = primaryImage.url || primaryImage.publicUrl || primaryImage.src;
  return url || fallback;
};

// Delete vehicle with cleanup
export const deleteVehicle = async (id) => {
  try {
    console.log(`🗑️ Deleting vehicle ${id}...`);
    
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
    // Clean up images
    if (vehicle?.images && Array.isArray(vehicle.images)) {
      const filenames = vehicle.images
        .map(img => img.fileName)
        .filter(Boolean);
      
      if (filenames.length > 0) {
        await supabase.storage
          .from('vehicle-images')
          .remove(filenames)
          .catch(e => console.error('⚠️ Error deleting images:', e));
      }
    }
    
    // Delete vehicle record
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    
    console.log('✅ Vehicle deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error);
    return { error };
  }
};

// Vehicle repair function
const completeVehicleImageRepair = async (vehicleId) => {
  try {
    console.log(`🔧 Starting repair for vehicle ${vehicleId}...`);
    
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Create a simple placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#1f2937');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    
    // Vehicle info
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 600, 300);
    
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`$${vehicle.price?.toLocaleString() || 'Call for Price'}`, 600, 380);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`${vehicle.mileage?.toLocaleString() || 'N/A'} miles`, 600, 440);
    
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('AUTO PRO REPAIRS & SALES', 600, 580);
    
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('(352) 933-5181 • Leesburg, FL', 600, 640);
    
    // Convert to blob and upload
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    
    const fileName = generateCleanFilename(`${vehicle.year}-${vehicle.make}-${vehicle.model}.jpg`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(uploadData.path);
    
    const newImages = [{
      url: publicUrl,
      alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      isPrimary: true,
      fileName: uploadData.path
    }];
    
    // Update vehicle
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ 
        images: newImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`✅ Repair completed for vehicle ${vehicleId}`);
    
    return {
      success: true,
      message: `Successfully repaired ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      newImageUrl: publicUrl
    };
    
  } catch (error) {
    console.error('❌ Repair failed:', error);
    return {
      success: false,
      error: error.message || 'Repair failed'
    };
  }
};

// Export repair functions
export const repairVehicleImages = async (vehicleId) => {
  return await completeVehicleImageRepair(vehicleId);
};

export const aggressiveRepairVehicle = async (vehicleId) => {
  return await completeVehicleImageRepair(vehicleId);
};

export const fixToyotaCamryNow = async () => {
  const camryId = '411138ea-874b-42f5-a234-7c8df83d3af3';
  return await completeVehicleImageRepair(camryId);
};

export const cleanSlateRepair = async () => {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*');
    
    if (error) throw error;
    
    const results = [];
    
    for (const vehicle of vehicles) {
      const processedImages = processVehicleImages(vehicle);
      const needsRepair = processedImages.length === 0 || processedImages[0].isFallback;
      
      if (needsRepair) {
        const repairResult = await completeVehicleImageRepair(vehicle.id);
        results.push({
          vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          id: vehicle.id,
          success: repairResult.success
        });
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      success: true,
      message: `Processed ${results.length} vehicles`,
      results
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Storage diagnostics
export const checkStorageConfig = async () => {
  try {
    console.log('🔍 Checking storage configuration...');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Missing environment variables' };
    }
    
    // Test bucket access
    const { data: files, error: listError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 10 });
    
    if (listError) {
      console.error('❌ Bucket error:', listError);
      return { success: false, error: listError.message };
    }
    
    console.log('✅ Found', files?.length || 0, 'files in bucket');
    
    return {
      success: true,
      message: 'Storage configuration OK',
      bucket: { 
        name: 'vehicle-images', 
        public: true 
      },
      fileCount: files?.length || 0,
      files: files?.slice(0, 5) || []
    };
  } catch (error) {
    console.error('❌ Storage check error:', error);
    return { success: false, error: error.message };
  }
};

export const setupStorageBucket = async () => {
  return await ensureStorageBucket();
};

export const testImageUpload = async () => {
  try {
    console.log('🧪 Testing image upload...');
    
    // Create simple test image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST IMAGE', 200, 150);
    ctx.fillText(new Date().toLocaleTimeString(), 200, 180);
    
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        try {
          const fileName = `test-${Date.now()}.png`;
          
          const { data, error } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, blob, { upsert: false });
          
          if (error) {
            resolve({ success: false, error: error.message });
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(data.path);
          
          resolve({
            success: true,
            message: 'Test upload successful',
            url: publicUrl,
            fileName: data.path
          });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const cleanupTestFiles = async () => {
  try {
    const { data: files, error } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1000 });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    const testFiles = files.filter(file => 
      file.name.includes('test')
    );
    
    if (testFiles.length === 0) {
      return { success: true, message: 'No test files found' };
    }
    
    const filenames = testFiles.map(f => f.name);
    const { error: deleteError } = await supabase.storage
      .from('vehicle-images')
      .remove(filenames);
    
    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
    
    return {
      success: true,
      message: `Deleted ${testFiles.length} test files`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// AUTH FUNCTIONS (keeping existing functionality)
export const signUp = async (email, password, metadata = {}) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    }
  });
};

export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getUser = async () => {
  return await supabase.auth.getUser();
};

export const getProfile = async (userId) => {
  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
};

// DATABASE OPERATIONS (keeping existing functionality)
export const getAppointments = async (filters = {}) => {
  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date) query = query.eq('date', filters.date);
  if (filters.technician_id) query = query.eq('technician_id', filters.technician_id);

  return await query;
};

export const createAppointment = async (appointmentData) => {
  const finalData = {
    ...appointmentData,
    status: appointmentData.status || 'pending',
    urgency: appointmentData.urgency || 'medium',
    confirmation_sent: false,
    reminder_sent: false,
    created_at: new Date().toISOString()
  };

  return await supabase
    .from('appointments')
    .insert([finalData])
    .select()
    .single();
};

export const updateAppointment = async (id, updates) => {
  return await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

export const deleteAppointment = async (id) => {
  return await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
};

export const getServices = async (active = true) => {
  let query = supabase
    .from('services')
    .select('*')
    .order('order_index', { ascending: true });

  if (active !== null) query = query.eq('active', active);
  return await query;
};

export const createService = async (serviceData) => {
  return await supabase
    .from('services')
    .insert([serviceData])
    .select()
    .single();
};

export const updateService = async (id, updates) => {
  return await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

export const deleteService = async (id) => {
  return await supabase
    .from('services')
    .delete()
    .eq('id', id);
};

export const getTestimonials = async (approved = true) => {
  let query = supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (approved !== null) query = query.eq('approved', approved);
  return await query;
};

export const createTestimonial = async (testimonialData) => {
  return await supabase
    .from('testimonials')
    .insert([{ ...testimonialData, created_at: new Date().toISOString() }])
    .select()
    .single();
};

export const updateTestimonial = async (id, updates) => {
  return await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

export const deleteTestimonial = async (id) => {
  return await supabase
    .from('testimonials')
    .delete()
    .eq('id', id);
};

export const createContactMessage = async (messageData) => {
  return await supabase
    .from('contact_messages')
    .insert([{
      ...messageData,
      read: false,
      responded: false,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
};

export const getContactMessages = async () => {
  return await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
};

export const updateContactMessage = async (id, updates) => {
  return await supabase
    .from('contact_messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

export const deleteContactMessage = async (id) => {
  return await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);
};

export const getDashboardStats = async () => {
  try {
    const [vehicles, appointments, testimonials] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('testimonials').select('*', { count: 'exact', head: true }).eq('approved', true)
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    const { count: pendingAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: availableVehicles } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    return {
      totalVehicles: vehicles.count || 0,
      availableVehicles: availableVehicles || 0,
      totalAppointments: appointments.count || 0,
      todayAppointments: todayAppointments || 0,
      pendingAppointments: pendingAppointments || 0,
      totalTestimonials: testimonials.count || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalVehicles: 0,
      availableVehicles: 0,
      totalAppointments: 0,
      todayAppointments: 0,
      pendingAppointments: 0,
      totalTestimonials: 0
    };
  }
};