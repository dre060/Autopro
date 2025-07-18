// frontend/src/lib/supabase.js - FIXED IMAGE HANDLING SIMPLIFIED
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

// SIMPLIFIED: Much more permissive URL validation for Supabase
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  url = url.trim();
  
  // Allow any valid HTTP/HTTPS URL or relative path
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return false;
  }
  
  // For Supabase URLs, always accept them as valid
  if (url.includes('supabase.co') || url.includes('supabase.')) {
    return true;
  }
  
  // For other URLs, check for common image indicators
  const imageIndicators = ['.jpg', '.jpeg', '.png', '.webp', '.gif', 'image', 'photo', 'picture'];
  return imageIndicators.some(indicator => url.toLowerCase().includes(indicator));
};

// SIMPLIFIED: Minimal URL cleaning that preserves functionality  
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  url = url.trim();
  
  if (!isValidImageUrl(url)) {
    return null;
  }
  
  // Only fix obvious URL issues, don't over-process
  if (url.includes('supabase.co')) {
    // Ensure HTTPS for Supabase
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    
    // Fix obvious double slashes (but preserve protocol)
    url = url.replace(/([^:])\/\/+/g, '$1/');
  }
  
  return url;
};

// SIMPLIFIED: Process images with minimal validation
const processVehicleImages = (vehicle) => {
  if (!vehicle || !vehicle.images) {
    return [getFallbackImage(vehicle)];
  }
  
  let imageArray = [];
  
  // Handle different storage formats
  if (Array.isArray(vehicle.images)) {
    imageArray = vehicle.images;
  } else if (typeof vehicle.images === 'string') {
    try {
      imageArray = JSON.parse(vehicle.images);
      if (!Array.isArray(imageArray)) {
        imageArray = [imageArray];
      }
    } catch (e) {
      return [getFallbackImage(vehicle)];
    }
  } else if (typeof vehicle.images === 'object' && vehicle.images.url) {
    imageArray = [vehicle.images];
  } else {
    return [getFallbackImage(vehicle)];
  }
  
  const validImages = [];
  
  // Process each image with minimal validation
  imageArray.forEach((img, index) => {
    if (!img) return;
    
    let imageUrl = null;
    let alt = '';
    let isPrimary = false;
    let fileName = null;
    
    if (typeof img === 'string') {
      imageUrl = img;
      alt = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
      isPrimary = index === 0;
    } else if (typeof img === 'object') {
      imageUrl = img.url || img.publicUrl || img.src;
      alt = img.alt || `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
      isPrimary = img.isPrimary !== undefined ? img.isPrimary : (index === 0);
      fileName = img.fileName;
    }
    
    // Apply minimal cleaning
    if (imageUrl) {
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl) {
        validImages.push({
          url: cleanedUrl,
          alt: alt || 'Vehicle Image',
          isPrimary,
          fileName
        });
      }
    }
  });
  
  // Fallback if no valid images
  if (validImages.length === 0) {
    return [getFallbackImage(vehicle)];
  }
  
  // Ensure at least one primary image
  if (!validImages.some(img => img.isPrimary)) {
    validImages[0].isPrimary = true;
  }
  
  return validImages;
};

// Fallback image
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

// FIXED: Upload images with better error handling and debugging
export const uploadVehicleImages = async (images) => {
  console.log('🚀 UPLOAD START: Uploading', images?.length || 0, 'images');
  
  if (!images || images.length === 0) {
    console.log('⚠️ No images provided');
    return { data: [], error: null };
  }

  // Ensure bucket exists first
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
      console.log(`📤 UPLOAD ${i + 1}/${images.length}: Processing ${image.name}`);
      
      // Basic validation
      if (!image || !image.name || !image.type || !image.type.startsWith('image/')) {
        throw new Error('Invalid image file');
      }
      
      if (image.size > 50 * 1024 * 1024) {
        throw new Error('Image too large (max 50MB)');
      }
      
      const fileName = generateCleanFilename(image.name);
      console.log(`📁 FILENAME: ${fileName}`);
      
      // Upload to Supabase with simpler options
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error(`❌ UPLOAD ERROR for ${fileName}:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log(`✅ UPLOAD SUCCESS:`, uploadData);
      
      // Generate public URL - this is the critical part
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(uploadData.path);
      
      console.log(`🔗 GENERATED URL:`, publicUrl);
      
      // Test the URL immediately
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        console.log(`🧪 URL TEST: ${testResponse.status} ${testResponse.statusText}`);
        
        if (!testResponse.ok) {
          console.warn(`⚠️ URL may not be accessible: ${testResponse.status}`);
        }
      } catch (testError) {
        console.warn(`⚠️ URL test failed:`, testError.message);
        // Don't fail the upload for this, just warn
      }
      
      const imageObject = {
        url: publicUrl, // Use URL directly without over-processing
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path
      };
      
      imageUrls.push(imageObject);
      console.log(`✅ PROCESSED IMAGE ${i + 1}:`, imageObject);
      
    } catch (error) {
      console.error(`❌ ERROR processing image ${i + 1}:`, error);
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

// ENHANCED: Bucket setup with better public access configuration
export const ensureStorageBucket = async () => {
  try {
    console.log('🪣 BUCKET CHECK: Verifying storage bucket...');
    
    // Check if bucket exists and is accessible
    const { data: files, error: listError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!listError) {
      console.log('✅ BUCKET EXISTS: Bucket is accessible');
      
      // Test upload and public URL generation
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFileName = `test-${Date.now()}.txt`;
      
      const { data: testUpload, error: testUploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(testFileName, testBlob, { upsert: true });
      
      if (!testUploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(testUpload.path);
        
        console.log('🔗 TEST URL:', publicUrl);
        
        // Test URL accessibility
        try {
          const response = await fetch(publicUrl, { method: 'HEAD' });
          console.log('📡 URL ACCESS TEST:', response.status, response.statusText);
          
          if (response.ok) {
            console.log('✅ BUCKET FULLY FUNCTIONAL');
          } else {
            console.warn('⚠️ BUCKET NOT PUBLIC:', response.status);
          }
        } catch (fetchError) {
          console.warn('⚠️ URL ACCESS FAILED:', fetchError.message);
        }
        
        // Cleanup test file
        await supabase.storage
          .from('vehicle-images')
          .remove([testFileName])
          .catch(() => {});
      }
      
      return { success: true, message: 'Bucket exists and accessible' };
    }
    
    // Create bucket if it doesn't exist
    console.log('🔨 CREATING BUCKET...');
    
    const { data: bucketData, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      if (createError.message?.includes('already exists')) {
        console.log('✅ BUCKET EXISTS');
        return { success: true, message: 'Bucket already exists' };
      }
      console.error('❌ CREATE FAILED:', createError);
      return { success: false, error: createError.message };
    }
    
    console.log('✅ BUCKET CREATED');
    return { success: true, message: 'Bucket created successfully' };
    
  } catch (error) {
    console.error('❌ BUCKET SETUP ERROR:', error);
    return { success: false, error: error.message };
  }
};

// Get vehicles with simplified image processing
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
    data.forEach((vehicle, index) => {
      console.log(`🚗 Processing vehicle ${index + 1}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      vehicle.images = processVehicleImages(vehicle);
      console.log(`📷 Images for ${vehicle.id}:`, vehicle.images.map(img => img.url));
    });
  }
  
  console.log(`✅ Returned ${data?.length || 0} vehicles`);
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
    data.images = processVehicleImages(data);
    console.log(`📷 Vehicle ${id} images:`, data.images.map(img => img.url));
  }
  
  // Increment views
  if (data && !error) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('⚠️ Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// SIMPLIFIED: Create vehicle with minimal processing
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('🔨 Creating vehicle with', images.length, 'images');
    
    // Upload images first
    let imageUrls = [];
    
    if (images && images.length > 0) {
      console.log('📤 Starting image upload...');
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      imageUrls = uploadResult.data || [];
      console.log('📷 Upload result:', imageUrls.length, 'images uploaded');
      
      if (uploadResult.error && uploadResult.error.partial) {
        console.warn('⚠️ Some images failed:', uploadResult.error.errors);
      }
    }
    
    // Use fallback if no images
    if (imageUrls.length === 0) {
      console.log('🔄 No images uploaded, using fallback');
      imageUrls = [getFallbackImage(vehicleData)];
    }

    // Prepare vehicle data
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
      images: imageUrls, // Store directly as array
      views: 0,
      created_at: new Date().toISOString()
    };

    console.log('💾 Saving to database...');
    console.log('📷 Images being saved:', finalVehicleData.images);

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
          await supabase.storage
            .from('vehicle-images')
            .remove(filenames)
            .catch(e => console.error('Cleanup failed:', e));
        }
      }
      
      throw error;
    }

    console.log('✅ Vehicle created:', data.id);
    
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
    console.log(`🔄 Updating vehicle ${id} with`, newImages.length, 'new images');
    
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
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        // Replace existing images with new ones
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

    console.log('💾 Updating in database...');

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

// Get image URL with fallback
export const getImageUrl = (imageObj, fallback = "/hero.jpg") => {
  if (!imageObj) return fallback;
  
  if (typeof imageObj === 'string' && imageObj !== '') {
    return cleanImageUrl(imageObj) || fallback;
  }
  
  if (imageObj.url && imageObj.url !== '') {
    return cleanImageUrl(imageObj.url) || fallback;
  }
  
  return fallback;
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
          .catch(e => console.error('Error deleting images:', e));
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

// Vehicle image repair
export const completeVehicleImageRepair = async (vehicleId) => {
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
    
    // Create new generated image
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e40af');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    
    // Vehicle info
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 600, 280);
    
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`$${vehicle.price?.toLocaleString() || 'N/A'}`, 600, 360);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`${vehicle.mileage?.toLocaleString() || 'N/A'} miles`, 600, 420);
    
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('AUTO PRO REPAIRS & SALES', 600, 560);
    
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('(352) 933-5181 • Leesburg, FL', 600, 620);
    
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
      url: publicUrl, // Use directly without over-processing
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
    
    console.log(`✅ Repair completed. New URL: ${publicUrl}`);
    
    return {
      success: true,
      message: `Successfully repaired ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      newImageUrl: publicUrl,
      fileName: fileName
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
  const result = await completeVehicleImageRepair(camryId);
  
  if (result.success) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      message: 'Toyota Camry successfully repaired',
      newImageUrl: result.newImageUrl
    };
  }
  
  return result;
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
          success: repairResult.success,
          message: repairResult.success ? 'Repaired' : repairResult.error
        });
        
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

// Storage diagnostics with detailed testing
export const checkStorageConfig = async () => {
  try {
    console.log('🔍 DIAGNOSTIC: Checking storage configuration...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon Key present:', !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Missing environment variables' };
    }
    
    // Test bucket access
    const { data: files, error: listError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 10 });
    
    if (listError) {
      console.error('❌ BUCKET ERROR:', listError);
      return { success: false, error: listError.message };
    }
    
    console.log('✅ BUCKET OK: Found', files?.length || 0, 'files');
    
    // Test URL generation and accessibility
    const testResults = [];
    
    if (files && files.length > 0) {
      for (let i = 0; i < Math.min(3, files.length); i++) {
        const file = files[i];
        
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(file.name);
        
        console.log(`🔗 TESTING URL ${i + 1}:`, publicUrl);
        
        try {
          const response = await fetch(publicUrl, { method: 'HEAD' });
          testResults.push({
            file: file.name,
            url: publicUrl,
            status: response.status,
            statusText: response.statusText,
            accessible: response.ok
          });
          console.log(`📡 RESULT ${i + 1}: ${response.status} ${response.statusText}`);
        } catch (fetchError) {
          testResults.push({
            file: file.name,
            url: publicUrl,
            status: 'ERROR',
            statusText: fetchError.message,
            accessible: false
          });
          console.log(`❌ RESULT ${i + 1}: ${fetchError.message}`);
        }
      }
    }
    
    return {
      success: true,
      message: 'Storage configuration checked',
      bucket: { 
        name: 'vehicle-images', 
        public: true,
        baseUrl: `${supabaseUrl}/storage/v1/object/public/vehicle-images/`
      },
      fileCount: files?.length || 0,
      urlTests: testResults,
      sampleFiles: files?.slice(0, 5) || []
    };
  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    return { success: false, error: error.message };
  }
};

export const setupStorageBucket = async () => {
  return await ensureStorageBucket();
};

export const testImageUpload = async () => {
  try {
    console.log('🧪 TESTING: Image upload...');
    
    // Create test image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Create a colorful test image
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST IMAGE', 200, 130);
    ctx.fillText(new Date().toLocaleTimeString(), 200, 170);
    
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        try {
          const fileName = generateCleanFilename('test-upload.png');
          console.log('📤 UPLOADING:', fileName);
          
          const { data, error } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) {
            console.error('❌ UPLOAD FAILED:', error);
            resolve({ success: false, error: error.message });
            return;
          }
          
          console.log('✅ UPLOAD SUCCESS:', data);
          
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(data.path);
          
          console.log('🔗 GENERATED URL:', publicUrl);
          
          // Test URL accessibility
          try {
            const response = await fetch(publicUrl, { method: 'HEAD' });
            console.log('📡 URL TEST:', response.status, response.statusText);
            
            resolve({
              success: true,
              message: `Test upload successful (${response.status})`,
              url: publicUrl,
              fileName: data.path,
              urlAccessible: response.ok
            });
          } catch (fetchError) {
            console.warn('⚠️ URL TEST FAILED:', fetchError.message);
            resolve({
              success: true,
              message: 'Upload successful but URL test failed',
              url: publicUrl,
              fileName: data.path,
              urlAccessible: false,
              urlError: fetchError.message
            });
          }
        } catch (error) {
          console.error('❌ TEST ERROR:', error);
          resolve({ success: false, error: error.message });
        }
      });
    });
  } catch (error) {
    console.error('❌ TEST SETUP ERROR:', error);
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
      file.name.includes('test') || file.name.includes('Test')
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

// Auth helpers (keeping existing functionality)
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

// Other database operations (keeping existing functionality)
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