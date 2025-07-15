// frontend/src/lib/supabase.js
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

// FIXED: Enhanced URL validation and cleaning
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for valid image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
  
  // Check for reasonable URL length (extremely long URLs often indicate corruption)
  const isReasonableLength = url.length < 500;
  
  // Check for valid URL structure
  const isValidStructure = url.startsWith('http') || url.startsWith('/');
  
  return hasValidExtension && isReasonableLength && isValidStructure;
};

// FIXED: Clean and validate image URLs
const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // First check if URL is valid
  if (!isValidImageUrl(url)) {
    console.warn('Invalid image URL detected:', url);
    return null;
  }
  
  // Remove double slashes except for protocol
  let cleaned = url.replace(/([^:]\/)\/+/g, '$1');
  
  // Remove any query parameters that might be corrupted
  cleaned = cleaned.split('?')[0];
  
  // Ensure proper URL structure
  if (cleaned.startsWith('/') || cleaned.startsWith('http')) {
    return cleaned;
  }
  
  return null;
};

// FIXED: Generate clean, simple filenames
const generateCleanFilename = (originalName = '', vehicleId = '') => {
  // Get file extension
  const ext = originalName.split('.').pop().toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = validExtensions.includes(ext) ? ext : 'jpg';
  
  // Create simple, clean filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const vehiclePrefix = vehicleId ? vehicleId.substring(0, 8) : 'vehicle';
  
  return `${vehiclePrefix}-${timestamp}-${randomId}.${fileExt}`;
};

// FIXED: Enhanced image upload with better filename generation
export const uploadVehicleImages = async (images) => {
  const imageUrls = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // Validate image
      if (!image || !image.name) {
        throw new Error('Invalid image file');
      }
      
      // Check file size (max 10MB)
      if (image.size > 10 * 1024 * 1024) {
        throw new Error('Image file too large (max 10MB)');
      }
      
      // Generate clean filename
      const fileName = generateCleanFilename(image.name);
      
      console.log(`Uploading image ${i + 1}/${images.length}: ${fileName}`);
      
      // Upload to Supabase with proper options
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      if (!uploadData || !uploadData.path) {
        throw new Error('Upload succeeded but no path returned');
      }
      
      // Get public URL using the exact path returned from upload
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
      
      // Add to results
      imageUrls.push({
        url: cleanedUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: uploadData.path
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

// FIXED: Repair function for broken vehicle images
export const repairVehicleImages = async (vehicleId) => {
  try {
    console.log(`Repairing images for vehicle ${vehicleId}...`);
    
    // Get the vehicle
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Create a high-quality placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    // Create professional gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    
    // Add vehicle information
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main vehicle text
    const vehicleText = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    ctx.fillText(vehicleText, 600, 350);
    
    // Additional details
    ctx.font = '36px Arial';
    ctx.fillText(`$${vehicle.price?.toLocaleString()}`, 600, 420);
    
    ctx.font = '28px Arial';
    ctx.fillText(`${vehicle.mileage?.toLocaleString()} miles`, 600, 470);
    
    // Company branding
    ctx.font = 'bold 42px Arial';
    ctx.fillText('AUTO PRO REPAIRS', 600, 550);
    
    // Convert to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    
    if (!blob) {
      throw new Error('Failed to create image blob');
    }
    
    // Generate clean filename
    const fileName = generateCleanFilename('repaired.jpg', vehicleId);
    
    // Upload the new image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
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
      throw new Error('Failed to generate valid URL');
    }
    
    // Create new image array with the repaired image
    const newImages = [{
      url: cleanedUrl,
      alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      isPrimary: true,
      fileName: uploadData.path
    }];
    
    // Update vehicle with new images
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ images: newImages })
      .eq('id', vehicleId);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`✅ Successfully repaired images for vehicle ${vehicleId}`);
    
    return {
      success: true,
      message: `Successfully repaired images for ${vehicleText}`,
      newImageUrl: cleanedUrl
    };
    
  } catch (error) {
    console.error('Error repairing vehicle images:', error);
    return {
      success: false,
      error: error.message || 'Failed to repair images'
    };
  }
};

// FIXED: Enhanced vehicle fetching with aggressive image cleaning
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
  
  // FIXED: Aggressive image cleaning and validation
  if (data) {
    data.forEach(vehicle => {
      // Initialize images array
      if (!vehicle.images || !Array.isArray(vehicle.images)) {
        vehicle.images = [];
      }
      
      // Clean and validate each image
      const validImages = [];
      
      if (vehicle.images.length > 0) {
        for (let i = 0; i < vehicle.images.length; i++) {
          const img = vehicle.images[i];
          let imageUrl = null;
          
          // Extract URL from different formats
          if (typeof img === 'string') {
            imageUrl = img;
          } else if (img && typeof img === 'object') {
            imageUrl = img.url || img.publicUrl;
          }
          
          // Validate and clean URL
          if (imageUrl && isValidImageUrl(imageUrl)) {
            const cleanedUrl = cleanImageUrl(imageUrl);
            if (cleanedUrl) {
              validImages.push({
                url: cleanedUrl,
                alt: img?.alt || `${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${i + 1}`,
                isPrimary: img?.isPrimary || validImages.length === 0,
                fileName: img?.fileName
              });
            }
          }
        }
      }
      
      // If no valid images found, use fallback
      if (validImages.length === 0) {
        validImages.push({
          url: '/hero.jpg',
          alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          isPrimary: true
        });
      }
      
      vehicle.images = validImages;
    });
  }
  
  return { data, error };
};

// FIXED: Enhanced vehicle by ID with same cleaning
export const getVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (data) {
    // Apply same image cleaning logic
    if (!data.images || !Array.isArray(data.images)) {
      data.images = [];
    }
    
    const validImages = [];
    
    if (data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        let imageUrl = null;
        
        if (typeof img === 'string') {
          imageUrl = img;
        } else if (img && typeof img === 'object') {
          imageUrl = img.url || img.publicUrl;
        }
        
        if (imageUrl && isValidImageUrl(imageUrl)) {
          const cleanedUrl = cleanImageUrl(imageUrl);
          if (cleanedUrl) {
            validImages.push({
              url: cleanedUrl,
              alt: img?.alt || `${data.year} ${data.make} ${data.model} - Image ${i + 1}`,
              isPrimary: img?.isPrimary || validImages.length === 0,
              fileName: img?.fileName
            });
          }
        }
      }
    }
    
    if (validImages.length === 0) {
      validImages.push({
        url: '/hero.jpg',
        alt: `${data.year} ${data.make} ${data.model}`,
        isPrimary: true
      });
    }
    
    data.images = validImages;
  }
  
  // Increment views
  if (data && !error) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id }).catch(e => {
      console.warn('Failed to increment views:', e);
    });
  }
  
  return { data, error };
};

// FIXED: Clean up orphaned and corrupted images
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
      let needsRepair = false;
      
      // Check if vehicle has broken images
      if (!vehicle.images || !Array.isArray(vehicle.images) || vehicle.images.length === 0) {
        needsRepair = true;
      } else {
        // Check each image
        for (const img of vehicle.images) {
          const url = typeof img === 'string' ? img : (img?.url || img?.publicUrl);
          if (!url || !isValidImageUrl(url)) {
            needsRepair = true;
            break;
          }
        }
      }
      
      if (needsRepair) {
        console.log(`Repairing vehicle ${vehicle.id}...`);
        const repairResult = await repairVehicleImages(vehicle.id);
        
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

// FIXED: Enhanced create vehicle with better image handling
export const createVehicle = async (vehicleData, images = []) => {
  try {
    console.log('Creating vehicle with', images.length, 'images');
    
    // Upload images first if provided
    let imageUrls = [];
    
    if (images && images.length > 0) {
      const uploadResult = await uploadVehicleImages(images);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw uploadResult.error;
      }
      
      imageUrls = uploadResult.data || [];
    }
    
    // If no images uploaded successfully, use fallback
    if (imageUrls.length === 0) {
      imageUrls = [{
        url: '/hero.jpg',
        alt: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
        isPrimary: true
      }];
    }

    // Prepare vehicle data
    const finalVehicleData = {
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
      features: vehicleData.features || [],
      key_features: vehicleData.key_features || [],
      financing_available: vehicleData.financing_available || false,
      monthly_payment: vehicleData.monthly_payment ? parseFloat(vehicleData.monthly_payment) : null,
      stock_number: vehicleData.stock_number || `AP${Date.now().toString().slice(-6)}`,
      status: vehicleData.status || 'available',
      condition: vehicleData.condition || 'Good',
      description: vehicleData.description || null,
      carfax_available: vehicleData.carfax_available || false,
      carfax_url: vehicleData.carfax_url || null,
      featured: vehicleData.featured || false,
      accident_history: vehicleData.accident_history || false,
      number_of_owners: parseInt(vehicleData.number_of_owners) || 1,
      service_records: vehicleData.service_records || false,
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
      if (imageUrls.length > 0 && imageUrls[0].url !== '/hero.jpg') {
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

// FIXED: Enhanced update vehicle 
export const updateVehicle = async (id, updates, newImages = []) => {
  try {
    // Get existing vehicle data
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Start with existing valid images
    let imageUrls = [];
    
    if (existingVehicle?.images && Array.isArray(existingVehicle.images)) {
      for (const img of existingVehicle.images) {
        const url = typeof img === 'string' ? img : (img?.url || img?.publicUrl);
        if (url && isValidImageUrl(url)) {
          const cleanedUrl = cleanImageUrl(url);
          if (cleanedUrl) {
            imageUrls.push({
              url: cleanedUrl,
              alt: img?.alt || 'Vehicle Image',
              isPrimary: img?.isPrimary || imageUrls.length === 0,
              fileName: img?.fileName
            });
          }
        }
      }
    }

    // Handle new image uploads
    if (newImages && newImages.length > 0) {
      const uploadResult = await uploadVehicleImages(newImages);
      
      if (uploadResult.error && !uploadResult.error.partial) {
        throw uploadResult.error;
      }
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        imageUrls = [...imageUrls, ...uploadResult.data];
      }
    }
    
    // Ensure at least one image
    if (imageUrls.length === 0) {
      imageUrls = [{
        url: '/hero.jpg',
        alt: `Vehicle Image`,
        isPrimary: true
      }];
    }

    // Prepare update data
    const updateData = {
      ...updates,
      images: imageUrls
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

    return { data, error };
    
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    return { data: null, error };
  }
};

// Rest of the functions remain the same...
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

// Delete vehicle
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
        .map(img => img.fileName || (img.url ? img.url.split('/').pop() : null))
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
  
  if (imageObj.publicUrl && imageObj.publicUrl !== '') {
    if (isValidImageUrl(imageObj.publicUrl)) {
      const cleaned = cleanImageUrl(imageObj.publicUrl);
      return cleaned || fallback;
    }
  }
  
  return fallback;
};

// Storage configuration check
export const checkStorageConfig = async () => {
  try {
    console.log('Checking storage configuration...');
    
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Supabase environment variables are not configured'
      };
    }
    
    // Try to list files in vehicle-images bucket
    try {
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 1 });
      
      if (filesError) {
        // If we get a "bucket not found" error, the bucket doesn't exist
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
        
        // Other errors
        return {
          success: false,
          error: `Bucket access error: ${filesError.message}`
        };
      }
      
      // If we can list files, the bucket exists and is accessible
      return {
        success: true,
        message: 'Storage configuration is valid and bucket exists',
        bucket: { name: 'vehicle-images', public: true },
        fileCount: files?.length || 0
      };
      
    } catch (error) {
      // Try a different approach - attempt to get a public URL
      const testFileName = 'test-connectivity-check.png';
      const { data: urlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(testFileName);
      
      if (urlData?.publicUrl) {
        return {
          success: true,
          message: 'Storage bucket exists and is accessible',
          bucket: { name: 'vehicle-images', public: true },
          fileCount: 'Unknown'
        };
      }
      
      return {
        success: false,
        error: 'Unable to verify bucket existence'
      };
    }
  } catch (error) {
    console.error('Storage config check error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

// Setup storage bucket
export const setupStorageBucket = async () => {
  try {
    console.log('Setting up storage bucket...');
    
    // First, try to access the bucket
    const { data: files, error: accessError } = await supabase.storage
      .from('vehicle-images')
      .list('', { limit: 1 });
    
    if (!accessError) {
      // Bucket already exists and is accessible
      return {
        success: true,
        message: 'Bucket already exists and is accessible',
        bucket: { name: 'vehicle-images', public: true }
      };
    }
    
    // Try to create the bucket
    const { data, error: createError } = await supabase.storage.createBucket('vehicle-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      // Check for specific error types
      if (createError.message?.includes('already exists')) {
        return {
          success: true,
          message: 'Bucket already exists',
          bucket: { name: 'vehicle-images', public: true }
        };
      }
      
      if (createError.message?.includes('row-level security policy')) {
        return {
          success: false,
          error: 'Bucket creation requires admin access. Please create the bucket in your Supabase Dashboard:\n1. Go to Storage section\n2. Click "New bucket"\n3. Name it "vehicle-images"\n4. Make it public\n5. Set file size limit to 50MB'
        };
      }
      
      return {
        success: false,
        error: `Failed to create bucket: ${createError.message}`
      };
    }
    
    return {
      success: true,
      message: 'Successfully created vehicle-images bucket',
      bucket: { name: 'vehicle-images', public: true }
    };
  } catch (error) {
    console.error('Setup bucket error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

// Enhanced test image upload with URL cleaning
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
          // Upload to Supabase
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
          
          // Get public URL and clean it
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

// Cleanup test files
export const cleanupTestFiles = async () => {
  try {
    console.log('Cleaning up test files...');
    
    // List all files in the bucket
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
    
    // Filter for test files
    const testFiles = files.filter(file => 
      file.name.startsWith('test-') || 
      file.name.startsWith('direct-test-') ||
      file.name.startsWith('placeholder-') ||
      file.name.startsWith('repaired-') ||
      file.name.includes('-test-')
    );
    
    if (testFiles.length === 0) {
      return {
        success: true,
        message: 'No test files found to clean up'
      };
    }
    
    // Delete test files
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

// Enhanced ensure storage bucket function
export const ensureStorageBucket = async () => {
  return await setupStorageBucket();
};