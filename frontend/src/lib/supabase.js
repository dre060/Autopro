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

// SIMPLIFIED: URL validation that's less restrictive
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Must be a valid HTTP/HTTPS URL or relative path
  const isValidUrl = url.startsWith('http://') || 
                    url.startsWith('https://') || 
                    url.startsWith('/');
  
  if (!isValidUrl) {
    return false;
  }
  
  // For Supabase URLs, be more permissive
  if (url.includes('supabase.co') || url.includes('supabase.')) {
    return true;
  }
  
  // For other URLs, check for image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return validExtensions.some(ext => url.toLowerCase().includes(ext));
};

// SIMPLIFIED: URL cleaning that preserves valid URLs
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    console.warn('Invalid URL input:', url);
    return null;
  }
  
  url = url.trim();
  
  if (!isValidImageUrl(url)) {
    console.warn('URL failed validation:', url);
    return null;
  }
  
  // Fix common URL issues
  if (url.includes('supabase.co')) {
    // Fix multiple slashes but preserve protocol
    url = url.replace(/([^:])\/\/+/g, '$1/');
    
    // Ensure HTTPS for Supabase
    if (url.startsWith('http://') && url.includes('supabase.co')) {
      url = url.replace('http://', 'https://');
    }
  }
  
  console.log('Cleaned URL:', url);
  return url;
};

// SIMPLIFIED: Image processing that's more reliable
const processVehicleImages = (vehicle) => {
  console.log('Processing images for vehicle:', vehicle?.id, 'Raw images:', vehicle?.images);
  
  if (!vehicle || !vehicle.images) {
    console.log('No images found, using fallback');
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
      console.warn('Failed to parse images JSON:', e);
      return [getFallbackImage(vehicle)];
    }
  } else if (typeof vehicle.images === 'object') {
    imageArray = [vehicle.images];
  } else {
    console.warn('Unknown images format:', typeof vehicle.images);
    return [getFallbackImage(vehicle)];
  }
  
  const validImages = [];
  
  // Process each image
  imageArray.forEach((img, index) => {
    if (!img) return;
    
    let imageUrl = null;
    let alt = '';
    let isPrimary = false;
    let fileName = null;
    
    // Extract data based on format
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
    
    // Clean and validate URL
    if (imageUrl) {
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl) {
        validImages.push({
          url: cleanedUrl,
          alt: alt || 'Vehicle Image',
          isPrimary,
          fileName
        });
        console.log(`Added image ${index}:`, cleanedUrl);
      } else {
        console.warn(`Rejected image ${index}:`, imageUrl);
      }
    }
  });
  
  // Ensure we have at least one image
  if (validImages.length === 0) {
    console.log('No valid images found, using fallback');
    return [getFallbackImage(vehicle)];
  }
  
  // Ensure at least one primary image
  if (!validImages.some(img => img.isPrimary)) {
    validImages[0].isPrimary = true;
  }
  
  console.log('Final processed images:', validImages);
  return validImages;
};

// SIMPLIFIED: Fallback image
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

// SIMPLIFIED: Filename generation
const generateCleanFilename = (originalName = '', vehicleId = '') => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = validExtensions.includes(ext) ? ext : 'jpg';
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const vehiclePrefix = vehicleId ? vehicleId.substring(0, 6) : 'auto';
  
  return `${vehiclePrefix}-${timestamp}-${randomId}.${fileExt}`;
};

// FIXED: Image upload with better error handling and logging
export const uploadVehicleImages = async (images) => {
  if (!images || images.length === 0) {
    console.log('No images to upload');
    return { data: [], error: null };
  }

  console.log(`🔄 Starting upload of ${images.length} images...`);
  
  const imageUrls = [];
  const errors = [];

  // Ensure bucket exists
  const bucketResult = await ensureStorageBucket();
  if (!bucketResult.success) {
    console.error('❌ Bucket setup failed:', bucketResult.error);
    return { data: [], error: { message: bucketResult.error } };
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      console.log(`📤 Processing image ${i + 1}/${images.length}:`, image.name);
      
      // Validate image
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
      console.log(`📁 Generated filename: ${fileName}`);
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        });
      
      if (uploadError) {
        console.error(`❌ Upload failed for ${fileName}:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log(`✅ Upload successful:`, uploadData);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(uploadData.path);
      
      console.log(`🔗 Generated public URL:`, publicUrl);
      
      // Clean URL (be more permissive for Supabase URLs)
      const cleanedUrl = cleanImageUrl(publicUrl);
      
      if (!cleanedUrl) {
        console.error(`❌ URL cleaning failed for:`, publicUrl);
        throw new Error('Generated URL is invalid');
      }
      
      const imageObject = {
        url: cleanedUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path // Store the full path for deletion
      };
      
      imageUrls.push(imageObject);
      console.log(`✅ Successfully processed image ${i + 1}:`, imageObject);
      
    } catch (error) {
      console.error(`❌ Error processing image ${i + 1}:`, error);
      errors.push({
        file: image.name || `Image ${i + 1}`,
        error: error.message
      });
    }
  }

  console.log(`🏁 Upload complete. Success: ${imageUrls.length}, Errors: ${errors.length}`);
  
  return { 
    data: imageUrls, 
    error: errors.length > 0 ? { partial: true, errors } : null 
  };
};

// ENHANCED: Get vehicles with detailed URL debugging
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
  
  // Process images for each vehicle with detailed debugging
  if (data && Array.isArray(data)) {
    data.forEach((vehicle, vehicleIndex) => {
      console.log(`\n🚗 Processing vehicle ${vehicleIndex + 1}/${data.length}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      console.log('Raw images data:', vehicle.images);
      console.log('Raw images type:', typeof vehicle.images);
      
      const processedImages = processVehicleImages(vehicle);
      
      console.log('Processed images:', processedImages);
      if (processedImages && processedImages.length > 0) {
        processedImages.forEach((img, imgIndex) => {
          console.log(`  📷 Image ${imgIndex + 1}: ${img.url}`);
          console.log(`    - Alt: ${img.alt}`);
          console.log(`    - Primary: ${img.isPrimary}`);
          console.log(`    - Fallback: ${img.isFallback || false}`);
        });
      }
      
      vehicle.images = processedImages;
    });
  }
  
  console.log(`✅ Fetched ${data?.length || 0} vehicles`);
  return { data, error };
};

// FIXED: Get vehicle by ID with simplified processing
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
    console.log(`✅ Fetched vehicle ${id} with ${data.images.length} images`);
  }
  
  // Increment views
  if (data && !error) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('⚠️ Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// FIXED: Create vehicle with simplified image handling
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('🔨 Creating vehicle with', images.length, 'images');
    console.log('Vehicle data:', vehicleData);
    
    // Upload images first
    let imageUrls = [];
    
    if (images && images.length > 0) {
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      imageUrls = uploadResult.data || [];
      
      if (uploadResult.error && uploadResult.error.partial) {
        console.warn('⚠️ Some images failed to upload:', uploadResult.error.errors);
      }
    }
    
    // Use fallback if no images uploaded successfully
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
      images: imageUrls, // Store as array of objects
      views: 0,
      created_at: new Date().toISOString()
    };

    console.log('💾 Saving vehicle to database:', finalVehicleData);

    // Insert vehicle into database
    const { data, error } = await supabase
      .from('vehicles')
      .insert([finalVehicleData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      
      // Clean up uploaded images on failure (but not fallback)
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
    
    // Process images for consistent format
    if (data) {
      data.images = processVehicleImages(data);
    }
    
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ Error in createVehicle:', error);
    return { data: null, error };
  }
};

// FIXED: Update vehicle with simplified handling
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

    console.log('💾 Updating vehicle in database:', updateData);

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
    console.error('❌ Error in updateVehicle:', error);
    return { data: null, error };
  }
};

// UTILITY: Get image URL with proper fallback
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

// FIXED: Vehicle image repair with better handling
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

// ENHANCED: Storage bucket setup with better configuration
export const ensureStorageBucket = async () => {
  try {
    console.log('🪣 Ensuring storage bucket exists...');
    
    // First try to access the bucket
    const { data: files, error: accessError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!accessError) {
      console.log('✅ Bucket exists and is accessible');
      
      // Check if bucket is properly configured for public access
      const testFileName = 'test-public-access.txt';
      const testContent = new Blob(['test'], { type: 'text/plain' });
      
      // Try uploading a test file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(testFileName, testContent, { upsert: true });
      
      if (!uploadError) {
        // Try getting public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(testFileName);
        
        console.log('🔗 Test public URL:', publicUrl);
        
        // Test accessibility
        try {
          const response = await fetch(publicUrl);
          console.log('📡 Public access test:', response.status);
          
          if (response.ok) {
            console.log('✅ Bucket is properly configured for public access');
          } else {
            console.warn('⚠️ Bucket may not be configured for public access');
          }
        } catch (e) {
          console.warn('⚠️ Public access test failed:', e.message);
        }
        
        // Clean up test file
        await supabase.storage
          .from('vehicle-images')
          .remove([testFileName])
          .catch(() => {});
      }
      
      return { success: true, message: 'Bucket exists and is accessible' };
    }
    
    console.log('🔨 Creating storage bucket...');
    
    // Create bucket with proper public settings
    const { data: bucketData, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800, // 50MB
      transformations: {
        allowedTransformations: ['resize', 'quality']
      }
    });
    
    if (createError) {
      if (createError.message?.includes('already exists')) {
        console.log('✅ Bucket already exists');
        return { success: true, message: 'Bucket already exists' };
      }
      console.error('❌ Failed to create bucket:', createError);
      throw createError;
    }
    
    console.log('✅ Successfully created bucket');
    
    // Verify the bucket was created properly
    const { data: verifyFiles, error: verifyError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (verifyError) {
      console.error('❌ Bucket verification failed:', verifyError);
      return { success: false, error: 'Bucket created but not accessible' };
    }
    
    return { success: true, message: 'Successfully created and verified bucket' };
  } catch (error) {
    console.error('❌ Bucket setup error:', error);
    return { success: false, error: error.message || 'Failed to setup bucket' };
  }
};

// Delete vehicle with proper cleanup
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

// ENHANCED: Storage diagnostics with better debugging
export const checkStorageConfig = async () => {
  try {
    console.log('🔍 Checking storage configuration...');
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
      console.error('❌ Bucket access error:', listError);
      return { success: false, error: listError.message };
    }
    
    console.log('✅ Bucket accessible, files found:', files?.length || 0);
    
    // Test public URL generation
    let testUrl = null;
    if (files && files.length > 0) {
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(files[0].name);
      
      testUrl = publicUrl;
      console.log('🔗 Sample public URL:', publicUrl);
      
      // Test if the URL is actually accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        console.log('📡 URL test response:', response.status, response.statusText);
      } catch (fetchError) {
        console.warn('⚠️ URL test failed:', fetchError.message);
      }
    }
    
    return {
      success: true,
      message: 'Storage configuration valid',
      bucket: { 
        name: 'vehicle-images', 
        public: true,
        url: `${supabaseUrl}/storage/v1/object/public/vehicle-images/`
      },
      fileCount: files?.length || 0,
      sampleUrl: testUrl,
      files: files?.slice(0, 5) || []
    };
  } catch (error) {
    console.error('❌ Storage config check failed:', error);
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