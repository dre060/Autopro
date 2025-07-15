// frontend/src/lib/supabase.js - COMPLETE IMAGE LOADING FIX
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

// FIXED: Enhanced URL validation
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Check for reasonable URL length
  if (url.length > 1000) {
    return false;
  }
  
  // Check for valid image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  // Check for valid URL structure
  const isValidStructure = url.startsWith('http://') || 
                          url.startsWith('https://') || 
                          url.startsWith('/');
  
  return hasValidExtension && isValidStructure;
};

// FIXED: Test if image actually exists and is accessible
const validateImageExists = async (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    // First check URL format
    if (!isValidImageUrl(url)) {
      return false;
    }
    
    // Then test if image actually exists and is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check if response is ok and content type is image
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    return contentType && contentType.startsWith('image/');
  } catch (error) {
    console.warn('Image existence check failed for:', url, error.message);
    return false;
  }
};

// FIXED: Enhanced URL cleaning
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Trim whitespace
  url = url.trim();
  
  // Check if URL is valid first
  if (!isValidImageUrl(url)) {
    return null;
  }
  
  // Remove double slashes except for protocol
  url = url.replace(/([^:]\/)\/+/g, '$1');
  
  // Remove any query parameters that might be corrupted
  url = url.split('?')[0];
  
  // Ensure HTTPS for Supabase URLs
  if (url.includes('supabase.co') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }
  
  return url;
};

// FIXED: Robust fallback image handler
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

// FIXED: Generate clean, collision-free filenames
const generateCleanFilename = (originalName = '', vehicleId = '') => {
  // Get file extension
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = validExtensions.includes(ext) ? ext : 'jpg';
  
  // Create timestamp and random components
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const vehiclePrefix = vehicleId ? vehicleId.substring(0, 8) : 'auto';
  
  // Create clean filename
  return `${vehiclePrefix}-${timestamp}-${randomId}.${fileExt}`;
};

// FIXED: Enhanced image processing with actual existence checking
const processVehicleImages = async (vehicle) => {
  if (!vehicle) {
    return [getFallbackImage()];
  }
  
  // Initialize images array if not exists
  if (!vehicle.images || !Array.isArray(vehicle.images)) {
    return [getFallbackImage(vehicle)];
  }
  
  const validImages = [];
  
  // Process each image with existence validation
  for (let i = 0; i < vehicle.images.length; i++) {
    const img = vehicle.images[i];
    
    if (!img) continue;
    
    let imageUrl = null;
    let imageAlt = null;
    let isPrimary = false;
    let fileName = null;
    
    // Extract data from different formats
    if (typeof img === 'string') {
      imageUrl = img;
    } else if (typeof img === 'object') {
      imageUrl = img.url || img.publicUrl || img.src;
      imageAlt = img.alt;
      isPrimary = img.isPrimary;
      fileName = img.fileName;
    }
    
    // Validate and test if image actually exists
    if (imageUrl) {
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl && await validateImageExists(cleanedUrl)) {
        validImages.push({
          url: cleanedUrl,
          alt: imageAlt || `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image',
          isPrimary: isPrimary || validImages.length === 0,
          fileName: fileName
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

// FIXED: Synchronous version for immediate use
const processVehicleImagesSync = (vehicle) => {
  if (!vehicle) {
    return [getFallbackImage()];
  }
  
  // Initialize images array if not exists
  if (!vehicle.images || !Array.isArray(vehicle.images)) {
    return [getFallbackImage(vehicle)];
  }
  
  const validImages = [];
  
  // Process each image
  for (let i = 0; i < vehicle.images.length; i++) {
    const img = vehicle.images[i];
    
    if (!img) continue;
    
    let imageUrl = null;
    let imageAlt = null;
    let isPrimary = false;
    let fileName = null;
    
    // Extract data from different formats
    if (typeof img === 'string') {
      imageUrl = img;
    } else if (typeof img === 'object') {
      imageUrl = img.url || img.publicUrl || img.src;
      imageAlt = img.alt;
      isPrimary = img.isPrimary;
      fileName = img.fileName;
    }
    
    // Basic URL validation (without async existence check)
    if (imageUrl && isValidImageUrl(imageUrl)) {
      const cleanedUrl = cleanImageUrl(imageUrl);
      
      if (cleanedUrl) {
        validImages.push({
          url: cleanedUrl,
          alt: imageAlt || `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Image',
          isPrimary: isPrimary || validImages.length === 0,
          fileName: fileName
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

// FIXED: Enhanced image upload with better error handling
export const uploadVehicleImages = async (images) => {
  if (!images || images.length === 0) {
    return { data: [], error: null };
  }

  console.log(`Starting upload of ${images.length} images...`);
  
  const imageUrls = [];
  const errors = [];

  // Ensure bucket exists first
  await ensureStorageBucket();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // Validate image file
      if (!image || !image.name || !image.type) {
        throw new Error('Invalid image file');
      }
      
      // Check file size (max 50MB)
      if (image.size > 50 * 1024 * 1024) {
        throw new Error('Image file too large (max 50MB)');
      }
      
      // Check file type
      if (!image.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      // Generate clean filename
      const fileName = generateCleanFilename(image.name);
      
      console.log(`Uploading image ${i + 1}/${images.length}: ${fileName}`);
      
      // Upload to Supabase with retry logic
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
        
        console.warn(`Upload attempt ${attempt + 1} failed:`, uploadError);
        
        if (attempt < 2) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (uploadError) {
        throw new Error(`Upload failed after 3 attempts: ${uploadError.message}`);
      }
      
      if (!uploadData || !uploadData.path) {
        throw new Error('Upload succeeded but no path returned');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(uploadData.path);
      
      if (!publicUrl) {
        throw new Error('Failed to generate public URL');
      }
      
      // Clean and validate the URL
      const cleanedUrl = cleanImageUrl(publicUrl);
      
      if (!cleanedUrl) {
        throw new Error('Generated URL is invalid');
      }
      
      // Test the URL accessibility
      const isAccessible = await validateImageExists(cleanedUrl);
      
      if (!isAccessible) {
        console.warn(`Uploaded image is not accessible: ${cleanedUrl}`);
      }
      
      // Add to results
      imageUrls.push({
        url: cleanedUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path
      });
      
      console.log(`✅ Successfully uploaded: ${fileName}`);
      
    } catch (error) {
      console.error(`❌ Error uploading image ${i + 1}:`, error);
      errors.push({
        file: image.name,
        error: error.message
      });
    }
  }

  const result = { 
    data: imageUrls, 
    error: errors.length > 0 ? { partial: true, errors } : null 
  };
  
  console.log(`Upload complete: ${imageUrls.length} successful, ${errors.length} failed`);
  return result;
};

// FIXED: Enhanced vehicle fetching with image validation
export const getVehicles = async (filters = {}) => {
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.featured !== undefined) {
    query = query.eq('featured', filters.featured);
  }
  if (filters.make) {
    query = query.eq('make', filters.make);
  }
  if (filters.model) {
    query = query.eq('model', filters.model);
  }
  if (filters.year) {
    query = query.eq('year', filters.year);
  }
  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  
  // Process all vehicle images (sync version for performance)
  if (data && Array.isArray(data)) {
    data.forEach(vehicle => {
      vehicle.images = processVehicleImagesSync(vehicle);
    });
  }
  
  return { data, error };
};

// FIXED: Enhanced vehicle by ID with image validation
export const getVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (data) {
    // Use async version for single vehicle to check image existence
    data.images = await processVehicleImages(data);
  }
  
  // Increment views
  if (data && !error) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// FIXED: Complete vehicle image repair with cleanup
export const completeVehicleImageRepair = async (vehicleId) => {
  try {
    console.log(`🔧 Starting complete repair for vehicle ${vehicleId}...`);
    
    // Get the vehicle
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log('Vehicle data:', vehicle);
    
    // Step 1: Clean up ALL existing images from storage
    if (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
      console.log('🗑️ Cleaning up existing images...');
      
      const filesToDelete = [];
      
      for (const img of vehicle.images) {
        if (img && typeof img === 'object' && img.fileName) {
          filesToDelete.push(img.fileName);
        } else if (typeof img === 'string') {
          // Extract filename from URL
          const urlParts = img.split('/');
          const fileName = urlParts[urlParts.length - 1];
          if (fileName && fileName.includes('.')) {
            filesToDelete.push(fileName);
          }
        }
      }
      
      if (filesToDelete.length > 0) {
        console.log('Deleting files:', filesToDelete);
        const { error: deleteError } = await supabase.storage
          .from('vehicle-images')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.warn('Error deleting old images:', deleteError);
        } else {
          console.log('✅ Successfully deleted old images');
        }
      }
    }
    
    // Step 2: Create a new high-quality image
    console.log('🎨 Creating new vehicle image...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    // Create beautiful gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#0f172a'); // slate-900
    gradient.addColorStop(0.3, '#1e40af'); // blue-800
    gradient.addColorStop(0.7, '#3b82f6'); // blue-500
    gradient.addColorStop(1, '#0f172a'); // slate-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    
    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1200;
      const y = Math.random() * 800;
      ctx.fillRect(x, y, 2, 2);
    }
    
    // Add content with better typography
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main vehicle title
    ctx.font = 'bold 64px Arial';
    const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    ctx.fillText(vehicleTitle, 600, 280);
    
    // Price with styling
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.fillText(`$${vehicle.price?.toLocaleString() || 'N/A'}`, 600, 360);
    
    // Reset color for other text
    ctx.fillStyle = '#ffffff';
    
    // Mileage
    ctx.font = '32px Arial';
    ctx.fillText(`${vehicle.mileage?.toLocaleString() || 'N/A'} miles`, 600, 420);
    
    // Features
    if (vehicle.features && vehicle.features.length > 0) {
      ctx.font = '24px Arial';
      const featuresText = vehicle.features.slice(0, 3).join(' • ');
      ctx.fillText(featuresText, 600, 480);
    }
    
    // Company branding
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#fbbf24'; // amber-400
    ctx.fillText('AUTO PRO REPAIRS & SALES', 600, 560);
    
    // Contact info
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('(352) 933-5181 • Leesburg, FL', 600, 620);
    
    // Stock number
    if (vehicle.stock_number) {
      ctx.font = '20px Arial';
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.fillText(`Stock: ${vehicle.stock_number}`, 600, 680);
    }
    
    // Step 3: Convert to blob and upload
    console.log('📤 Converting and uploading image...');
    
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    
    if (!blob) {
      throw new Error('Failed to create image blob');
    }
    
    // Generate a simple, clean filename
    const timestamp = Date.now();
    const shortId = vehicleId.substring(0, 8);
    const fileName = `${vehicle.year}-${vehicle.make}-${vehicle.model}-${shortId}-${timestamp}.jpg`
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    
    console.log(`📤 Uploading new image: ${fileName}`);
    
    // Upload with retry logic
    let uploadData, uploadError;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });
      
      uploadData = result.data;
      uploadError = result.error;
      
      if (!uploadError) break;
      
      console.warn(`Upload attempt ${attempt + 1} failed:`, uploadError);
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (uploadError) {
      throw new Error(`Upload failed after 3 attempts: ${uploadError.message}`);
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Failed to generate public URL');
    }
    
    console.log('🔗 Generated URL:', publicUrl);
    
    // Step 4: Test if the new image is accessible
    console.log('🧪 Testing image accessibility...');
    
    const isAccessible = await validateImageExists(publicUrl);
    
    if (!isAccessible) {
      console.warn('⚠️ New image may not be immediately accessible');
    }
    
    // Step 5: Create clean image array
    const newImages = [{
      url: publicUrl,
      alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      isPrimary: true,
      fileName: fileName
    }];
    
    // Step 6: Update the vehicle record
    console.log('💾 Updating vehicle record...');
    
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
    
    console.log('✅ Vehicle updated successfully');
    
    // Step 7: Verify the update
    const { data: updatedVehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', vehicleId)
      .single();
    
    console.log('✅ Updated vehicle images:', updatedVehicle?.images);
    
    return {
      success: true,
      message: `Successfully repaired ${vehicleTitle}`,
      newImageUrl: publicUrl,
      fileName: fileName,
      isAccessible: isAccessible
    };
    
  } catch (error) {
    console.error('❌ Complete repair failed:', error);
    return {
      success: false,
      error: error.message || 'Repair failed'
    };
  }
};

// FIXED: Enhanced repair function that uses the complete repair
export const repairVehicleImages = async (vehicleId) => {
  return await completeVehicleImageRepair(vehicleId);
};

// FIXED: Enhanced create vehicle with better image handling
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('Creating vehicle with', images.length, 'images');
    
    // Upload images first if provided
    let imageUrls = [];
    
    if (images && images.length > 0) {
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      imageUrls = uploadResult.data || [];
    }
    
    // Use fallback if no images uploaded successfully
    if (imageUrls.length === 0) {
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

    // Insert vehicle into database
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

// FIXED: Enhanced update vehicle with better image handling
export const updateVehicle = async (id, updates, newImages = []) => {
  try {
    // Get existing vehicle data
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Process existing images
    let imageUrls = processVehicleImagesSync(existingVehicle);
    
    // Handle new image uploads
    if (newImages && newImages.length > 0) {
      const uploadResult = await uploadVehicleImages(newImages);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw new Error(`Image upload failed: ${uploadResult.error.message || 'Unknown error'}`);
      }
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        // Replace existing images with new ones
        imageUrls = uploadResult.data;
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

    if (data) {
      data.images = processVehicleImagesSync(data);
    }

    return { data, error };
    
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    return { data: null, error };
  }
};

// FIXED: Enhanced cleanup function
export const cleanupCorruptedImages = async () => {
  try {
    console.log('Starting cleanup of corrupted images...');
    
    // Get all vehicles with their images
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, year, make, model, images');
    
    if (vehiclesError) {
      throw vehiclesError;
    }
    
    const repairedVehicles = [];
    
    for (const vehicle of vehicles) {
      const processedImages = processVehicleImagesSync(vehicle);
      const needsRepair = processedImages.length === 0 || processedImages[0].isFallback;
      
      if (needsRepair) {
        console.log(`Repairing vehicle ${vehicle.id}...`);
        const repairResult = await completeVehicleImageRepair(vehicle.id);
        
        if (repairResult.success) {
          repairedVehicles.push({
            id: vehicle.id,
            name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            status: 'repaired'
          });
        } else {
          repairedVehicles.push({
            id: vehicle.id,
            name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            status: 'failed',
            error: repairResult.error
          });
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      success: true,
      message: `Cleanup completed. Repaired ${repairedVehicles.filter(v => v.status === 'repaired').length} vehicles.`,
      repairedVehicles
    };
    
  } catch (error) {
    console.error('Error in cleanup:', error);
    return {
      success: false,
      error: error.message || 'Cleanup failed'
    };
  }
};

// FIXED: Enhanced storage bucket setup
export const ensureStorageBucket = async () => {
  try {
    // First, try to access the bucket
    const { data: files, error: accessError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!accessError) {
      return {
        success: true,
        message: 'Bucket already exists and is accessible'
      };
    }
    
    // Try to create the bucket
    const { data, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      if (createError.message?.includes('already exists')) {
        return {
          success: true,
          message: 'Bucket already exists'
        };
      }
      
      throw createError;
    }
    
    return {
      success: true,
      message: 'Successfully created vehicle-images bucket'
    };
  } catch (error) {
    console.error('Bucket setup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to setup bucket'
    };
  }
};

// Helper function to get image URL with fallback
export const getImageUrl = (imageObj, fallback = "/hero.jpg") => {
  if (!imageObj) return fallback;
  
  // Handle different image object structures
  if (typeof imageObj === 'string' && imageObj !== '') {
    if (isValidImageUrl(imageObj)) {
      const cleaned = cleanImageUrl(imageObj);
      return cleaned || fallback;
    }
  }
  
  if (imageObj.url && imageObj.url !== '') {
    if (isValidImageUrl(imageObj.url)) {
      const cleaned = cleanImageUrl(imageObj.url);
      return cleaned || fallback;
    }
  }
  
  return fallback;
};

// Delete vehicle with proper cleanup
export const deleteVehicle = async (id) => {
  try {
    // Get vehicle to find associated images
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
    // Delete associated images from storage
    if (vehicle?.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
      const filenames = vehicle.images
        .map(img => img.fileName)
        .filter(Boolean);
      
      if (filenames.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('vehicle-images')
          .remove(filenames);
        
        if (storageError) {
          console.error('Error deleting images from storage:', storageError);
        }
      }
    }
    
    // Delete vehicle record
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    return { error };
  } catch (error) {
    console.error('Error in deleteVehicle:', error);
    return { error };
  }
};

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    }
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

// Appointment operations
export const getAppointments = async (filters = {}) => {
  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.technician_id) {
    query = query.eq('technician_id', filters.technician_id);
  }

  const { data, error } = await query;
  return { data, error };
};

export const createAppointment = async (appointmentData) => {
  try {
    const finalAppointmentData = {
      name: appointmentData.name,
      email: appointmentData.email,
      phone: appointmentData.phone,
      service: appointmentData.service,
      date: appointmentData.date,
      time: appointmentData.time,
      end_time: appointmentData.end_time || null,
      message: appointmentData.message || null,
      vehicle_info: appointmentData.vehicle_info || null,
      status: appointmentData.status || 'pending',
      urgency: appointmentData.urgency || 'medium',
      technician_id: appointmentData.technician_id || null,
      assigned_technician: appointmentData.assigned_technician || null,
      bay: appointmentData.bay || null,
      estimated_cost: appointmentData.estimated_cost || null,
      actual_cost: appointmentData.actual_cost || null,
      notes: appointmentData.notes || [],
      confirmation_sent: appointmentData.confirmation_sent || false,
      reminder_sent: appointmentData.reminder_sent || false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([finalAppointmentData])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error in createAppointment:', error);
    return { data: null, error };
  }
};

export const updateAppointment = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error in updateAppointment:', error);
    return { data: null, error };
  }
};

export const deleteAppointment = async (id) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  return { error };
};

// Service operations
export const getServices = async (active = true) => {
  let query = supabase
    .from('services')
    .select('*')
    .order('order_index', { ascending: true });

  if (active !== null) {
    query = query.eq('active', active);
  }

  const { data, error } = await query;
  return { data, error };
};

export const createService = async (serviceData) => {
  const { data, error } = await supabase
    .from('services')
    .insert([serviceData])
    .select()
    .single();

  return { data, error };
};

export const updateService = async (id, updates) => {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

export const deleteService = async (id) => {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  return { error };
};

// Testimonial operations
export const getTestimonials = async (approved = true) => {
  let query = supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (approved !== null) {
    query = query.eq('approved', approved);
  }

  const { data, error } = await query;
  return { data, error };
};

export const createTestimonial = async (testimonialData) => {
  const finalData = {
    ...testimonialData,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('testimonials')
    .insert([finalData])
    .select()
    .single();

  return { data, error };
};

export const updateTestimonial = async (id, updates) => {
  const { data, error } = await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

export const deleteTestimonial = async (id) => {
  const { error } = await supabase
    .from('testimonials')
    .delete()
    .eq('id', id);

  return { error };
};

// Contact message operations
export const createContactMessage = async (messageData) => {
  const finalData = {
    name: messageData.name,
    email: messageData.email,
    phone: messageData.phone || null,
    subject: messageData.subject,
    message: messageData.message,
    read: false,
    responded: false,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('contact_messages')
    .insert([finalData])
    .select()
    .single();

  return { data, error };
};

export const getContactMessages = async () => {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
};

export const updateContactMessage = async (id, updates) => {
  const { data, error } = await supabase
    .from('contact_messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

export const deleteContactMessage = async (id) => {
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);

  return { error };
};

// Analytics
export const getDashboardStats = async () => {
  try {
    // Get counts using Supabase's count functionality
    const [vehicles, appointments, testimonials] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('testimonials').select('*', { count: 'exact', head: true }).eq('approved', true)
    ]);

    // Get today's appointments
    const today = new Date().toISOString().split('T')[0];
    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    // Get pending appointments
    const { count: pendingAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get available vehicles
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

// Storage diagnostic functions
export const checkStorageConfig = async () => {
  try {
    console.log('Checking storage configuration...');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Supabase environment variables are not configured'
      };
    }
    
    const { data: files, error: filesError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (filesError) {
      if (filesError.message?.includes('not found')) {
        return {
          success: true,
          message: 'Storage is accessible but vehicle-images bucket does not exist',
          bucket: null,
          warnings: [{
            error: 'vehicle-images bucket not found. Create it in Supabase Dashboard.'
          }]
        };
      }
      
      return {
        success: false,
        error: `Bucket access error: ${filesError.message}`
      };
    }
    
    return {
      success: true,
      message: 'Storage configuration is valid and bucket exists',
      bucket: { name: 'vehicle-images', public: true },
      fileCount: files?.length || 0
    };
  } catch (error) {
    console.error('Storage config check error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

export const setupStorageBucket = async () => {
  return await ensureStorageBucket();
};

export const testImageUpload = async () => {
  try {
    console.log('Testing image upload...');
    
    // Create a test blob
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
    
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'test-image.png', { type: 'image/png' });
        const fileName = generateCleanFilename('test-image.png');
        
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            resolve({
              success: false,
              error: uploadError.message
            });
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          const cleanedUrl = cleanImageUrl(publicUrl);
          
          resolve({
            success: true,
            message: 'Test image uploaded successfully',
            url: cleanedUrl,
            fileName: fileName
          });
        } catch (error) {
          resolve({
            success: false,
            error: error.message
          });
        }
      });
    });
  } catch (error) {
    console.error('Test upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const cleanupTestFiles = async () => {
  try {
    console.log('Cleaning up test files...');
    
    const { data: files, error: listError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1000 });
    
    if (listError) {
      return {
        success: false,
        error: `Failed to list files: ${listError.message}`
      };
    }
    
    if (!files || files.length === 0) {
      return {
        success: true,
        message: 'No files to clean up'
      };
    }
    
    const testFiles = files.filter(file => 
      file.name.startsWith('test-') || 
      file.name.startsWith('direct-test-') ||
      file.name.includes('-test-')
    );
    
    if (testFiles.length === 0) {
      return {
        success: true,
        message: 'No test files found to clean up'
      };
    }
    
    const filenames = testFiles.map(f => f.name);
    const { error: deleteError } = await supabase.storage
      .from('vehicle-images')
      .remove(filenames);
    
    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete files: ${deleteError.message}`
      };
    }
    
    return {
      success: true,
      message: `Successfully deleted ${testFiles.length} test files`
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

// Emergency repair functions
export const aggressiveRepairVehicle = async (vehicleId) => {
  return await completeVehicleImageRepair(vehicleId);
};

export const fixToyotaCamryNow = async () => {
  const camryId = '411138ea-874b-42f5-a234-7c8df83d3af3';
  
  console.log('🚗 Starting Toyota Camry emergency repair...');
  
  try {
    const repairResult = await completeVehicleImageRepair(camryId);
    
    if (!repairResult.success) {
      throw new Error(repairResult.error);
    }
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Toyota Camry successfully repaired and refreshed',
      newImageUrl: repairResult.newImageUrl
    };
    
  } catch (error) {
    console.error('Toyota Camry repair failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const cleanSlateRepair = async () => {
  try {
    console.log('🧹 Starting clean slate repair...');
    
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*');
    
    if (vehiclesError) {
      throw vehiclesError;
    }
    
    const results = [];
    
    for (const vehicle of vehicles) {
      console.log(`🔧 Processing ${vehicle.year} ${vehicle.make} ${vehicle.model}...`);
      
      const processedImages = processVehicleImagesSync(vehicle);
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
      message: `Clean slate repair completed. Processed ${results.length} vehicles.`,
      results: results
    };
    
  } catch (error) {
    console.error('Clean slate repair failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};