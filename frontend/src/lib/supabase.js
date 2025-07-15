// frontend/src/lib/supabase.js - FIXED IMAGE URL HANDLING
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

// FIXED: Improved URL validation
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Check for valid image extensions or Supabase storage URLs
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  const isSupabaseUrl = url.includes('supabase.co/storage');
  const isValidStructure = url.startsWith('http://') || 
                          url.startsWith('https://') || 
                          url.startsWith('/');
  
  return (hasValidExtension || isSupabaseUrl) && isValidStructure;
};

// FIXED: Better URL cleaning that handles Supabase paths correctly
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  url = url.trim();
  
  if (!isValidImageUrl(url)) {
    return null;
  }
  
  // Fix the double slash issue specifically for Supabase URLs
  if (url.includes('supabase.co/storage')) {
    // Replace multiple slashes but preserve the protocol slashes
    url = url.replace(/([^:])\/\/+/g, '$1/');
    
    // Ensure HTTPS for Supabase URLs
    if (url.startsWith('http://') && url.includes('supabase.co')) {
      url = url.replace('http://', 'https://');
    }
  }
  
  return url;
};

// FIXED: Simplified image processing
const processVehicleImages = (vehicle) => {
  if (!vehicle) {
    return [getFallbackImage()];
  }
  
  let imageArray = [];
  
  // Handle different image data formats
  if (Array.isArray(vehicle.images)) {
    imageArray = vehicle.images;
  } else if (typeof vehicle.images === 'string') {
    try {
      imageArray = JSON.parse(vehicle.images);
    } catch (e) {
      console.warn('Failed to parse images JSON for vehicle:', vehicle.id);
      return [getFallbackImage(vehicle)];
    }
  } else if (vehicle.images && typeof vehicle.images === 'object') {
    imageArray = [vehicle.images];
  } else {
    return [getFallbackImage(vehicle)];
  }
  
  const validImages = [];
  
  for (let i = 0; i < imageArray.length; i++) {
    const img = imageArray[i];
    
    if (!img) continue;
    
    let imageUrl = null;
    
    // Extract URL from different formats
    if (typeof img === 'string') {
      imageUrl = img;
    } else if (typeof img === 'object') {
      imageUrl = img.url || img.publicUrl || img.src;
    }
    
    // Clean and validate URL
    if (imageUrl) {
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl) {
        validImages.push({
          url: cleanedUrl,
          alt: img.alt || `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image',
          isPrimary: img.isPrimary || validImages.length === 0,
          fileName: img.fileName
        });
      }
    }
  }
  
  // Return fallback if no valid images
  if (validImages.length === 0) {
    return [getFallbackImage(vehicle)];
  }
  
  // Ensure at least one primary image
  if (!validImages.some(img => img.isPrimary)) {
    validImages[0].isPrimary = true;
  }
  
  return validImages;
};

// FIXED: Fallback image handler
const getFallbackImage = (vehicle) => {
  const fallbackAlt = vehicle ? 
    `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image' :
    'Vehicle Image';
    
  return {
    url: '/hero.jpg',
    alt: fallbackAlt,
    isPrimary: true,
    isFallback: true
  };
};

// FIXED: Better filename generation
const generateCleanFilename = (originalName = '', vehicleId = '') => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = validExtensions.includes(ext) ? ext : 'jpg';
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const vehiclePrefix = vehicleId ? vehicleId.substring(0, 8) : 'auto';
  
  // Clean filename to avoid special characters
  return `${vehiclePrefix}-${timestamp}-${randomId}.${fileExt}`.replace(/[^a-zA-Z0-9.-]/g, '-');
};

// FIXED: Image upload with proper URL handling
export const uploadVehicleImages = async (images) => {
  if (!images || images.length === 0) {
    return { data: [], error: null };
  }

  console.log(`Starting upload of ${images.length} images...`);
  
  const imageUrls = [];
  const errors = [];

  // Ensure bucket exists
  await ensureStorageBucket();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // Basic validation
      if (!image || !image.name || !image.type) {
        throw new Error('Invalid image file');
      }
      
      if (image.size > 50 * 1024 * 1024) {
        throw new Error('Image file too large (max 50MB)');
      }
      
      if (!image.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      const fileName = generateCleanFilename(image.name);
      
      console.log(`Uploading image ${i + 1}/${images.length}: ${fileName}`);
      
      // Upload with retry
      let uploadData, uploadError;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false,
            contentType: image.type
          });
        
        uploadData = result.data;
        uploadError = result.error;
        
        if (!uploadError) break;
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // FIXED: Get public URL and clean it properly
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(uploadData.path);
      
      if (!publicUrl) {
        throw new Error('Failed to generate public URL');
      }
      
      const cleanedUrl = cleanImageUrl(publicUrl);
      
      if (!cleanedUrl) {
        console.error('Generated URL is invalid:', publicUrl);
        throw new Error('Generated URL is invalid');
      }
      
      imageUrls.push({
        url: cleanedUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path // Store the path, not the filename
      });
      
      console.log(`✅ Successfully uploaded: ${fileName} -> ${cleanedUrl}`);
      
    } catch (error) {
      console.error(`❌ Error uploading image ${i + 1}:`, error);
      errors.push({
        file: image.name,
        error: error.message
      });
    }
  }

  return { 
    data: imageUrls, 
    error: errors.length > 0 ? { partial: true, errors } : null 
  };
};

// FIXED: Get vehicles with better image processing
export const getVehicles = async (filters = {}) => {
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
  
  // Process images for each vehicle
  if (data && Array.isArray(data)) {
    data.forEach(vehicle => {
      vehicle.images = processVehicleImages(vehicle);
      console.log(`Processed images for vehicle ${vehicle.id}:`, vehicle.images);
    });
  }
  
  return { data, error };
};

// FIXED: Get vehicle by ID with better image processing
export const getVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (data) {
    data.images = processVehicleImages(data);
    console.log(`Processed images for vehicle ${data.id}:`, data.images);
  }
  
  // Increment views
  if (data && !error) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// FIXED: Create vehicle with better image handling
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('Creating vehicle with', images.length, 'images');
    
    // Upload images first
    let imageUrls = [];
    
    if (images && images.length > 0) {
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      imageUrls = uploadResult.data || [];
    }
    
    // Use fallback if no images uploaded
    if (imageUrls.length === 0) {
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
      images: imageUrls,
      views: 0,
      created_at: new Date().toISOString()
    };

    console.log('Final vehicle data:', finalVehicleData);

    // Insert vehicle
    const { data, error } = await supabase
      .from('vehicles')
      .insert([finalVehicleData])
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      
      // Clean up uploaded images on failure
      if (imageUrls.length > 0 && !imageUrls[0].isFallback) {
        const filenames = imageUrls.map(img => img.fileName).filter(Boolean);
        if (filenames.length > 0) {
          await supabase.storage
            .from('vehicle-images')
            .remove(filenames)
            .catch(e => console.error('Failed to clean up images:', e));
        }
      }
      
      throw error;
    }

    console.log('✅ Vehicle created successfully:', data.id);
    return { data, error: null };
    
  } catch (error) {
    console.error('Error in createVehicle:', error);
    return { data: null, error };
  }
};

// FIXED: Update vehicle with better image handling
export const updateVehicle = async (id, updates, newImages = []) => {
  try {
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
      const uploadResult = await uploadVehicleImages(newImages);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        imageUrls = uploadResult.data;
      }
    }
    
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

    if (data) {
      data.images = processVehicleImages(data);
    }

    return { data, error };
    
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    return { data: null, error };
  }
};

// FIXED: Helper function to get image URL with proper fallback
export const getImageUrl = (imageObj, fallback = "/hero.jpg") => {
  if (!imageObj) return fallback;
  
  if (typeof imageObj === 'string' && imageObj !== '') {
    const cleaned = cleanImageUrl(imageObj);
    return cleaned || fallback;
  }
  
  if (imageObj.url && imageObj.url !== '') {
    const cleaned = cleanImageUrl(imageObj.url);
    return cleaned || fallback;
  }
  
  return fallback;
};

// FIXED: Vehicle image repair with better URL handling
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
    
    // Clean up existing images
    if (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
      const filesToDelete = vehicle.images
        .map(img => img.fileName)
        .filter(Boolean);
      
      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('vehicle-images')
          .remove(filesToDelete)
          .catch(e => console.warn('Error deleting old images:', e));
      }
    }
    
    // Create new image
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
    
    // FIXED: Get public URL and clean it
    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(uploadData.path);
    
    const cleanedUrl = cleanImageUrl(publicUrl);
    
    if (!cleanedUrl) {
      throw new Error('Failed to generate valid public URL');
    }
    
    const newImages = [{
      url: cleanedUrl,
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
    
    console.log(`✅ Repair completed. New URL: ${cleanedUrl}`);
    
    return {
      success: true,
      message: `Successfully repaired ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      newImageUrl: cleanedUrl,
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

// Storage bucket setup
export const ensureStorageBucket = async () => {
  try {
    const { data: files, error: accessError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!accessError) {
      return { success: true, message: 'Bucket exists and is accessible' };
    }
    
    const { data, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800
    });
    
    if (createError) {
      if (createError.message?.includes('already exists')) {
        return { success: true, message: 'Bucket already exists' };
      }
      throw createError;
    }
    
    return { success: true, message: 'Successfully created bucket' };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to setup bucket' };
  }
};

// Delete vehicle with proper cleanup
export const deleteVehicle = async (id) => {
  try {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
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
    
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Repair functions
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

// Storage diagnostics
export const checkStorageConfig = async () => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Missing environment variables' };
    }
    
    const { data: files, error } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      message: 'Storage configuration valid',
      bucket: { name: 'vehicle-images', public: true },
      fileCount: files?.length || 0
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const setupStorageBucket = async () => {
  return await ensureStorageBucket();
};

export const testImageUpload = async () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST', 100, 100);
    
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        const fileName = generateCleanFilename('test.png');
        
        const { data, error } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          resolve({ success: false, error: error.message });
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(data.path);
        
        const cleanedUrl = cleanImageUrl(publicUrl);
        
        resolve({
          success: true,
          message: 'Test upload successful',
          url: cleanedUrl,
          fileName: data.path
        });
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
      file.name.startsWith('test-') || file.name.includes('-test-')
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

// Auth helpers
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

// Other database operations remain the same...
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