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

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`
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

// Vehicle operations
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
  return { data, error };
};

export const getVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  
  // Increment views if found
  if (data && !error) {
    await supabase
      .from('vehicles')
      .update({ 
        views: (data.views || 0) + 1 
      })
      .eq('id', id);
  }
  
  return { data, error };
};

export const createVehicle = async (vehicleData, images = []) => {
  try {
    // Upload images first if provided
    const imageUrls = [];
    
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        
        // Get public URL - Fixed to handle the correct response structure
        const { data: urlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(fileName);
        
        imageUrls.push({
          url: urlData.publicUrl,
          alt: `${vehicleData.make} ${vehicleData.model} - Image ${i + 1}`,
          isPrimary: i === 0
        });
      }
    }

    // Prepare vehicle data with proper field mapping
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
      number_of_owners: vehicleData.number_of_owners || 1,
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
      // If database insert fails, try to clean up uploaded images
      if (imageUrls.length > 0) {
        const filenames = imageUrls.map(img => {
          const url = img.url;
          return url.split('/').pop();
        });
        
        await supabase.storage
          .from('vehicle-images')
          .remove(filenames);
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createVehicle:', error);
    return { data: null, error };
  }
};

export const updateVehicle = async (id, updates, newImages = []) => {
  try {
    // Get existing vehicle data
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
    let imageUrls = existingVehicle?.images || [];

    // Handle new image uploads
    if (newImages && newImages.length > 0) {
      for (let i = 0; i < newImages.length; i++) {
        const image = newImages[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          imageUrls.push({
            url: urlData.publicUrl,
            alt: `${updates.make || ''} ${updates.model || ''} - Image`,
            isPrimary: imageUrls.length === 0
          });
        }
      }
    }

    // Prepare update data with proper type conversion
    const updateData = {
      ...updates,
      images: imageUrls
    };

    // Convert numeric fields
    if (updateData.year) updateData.year = parseInt(updateData.year);
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.sale_price) updateData.sale_price = parseFloat(updateData.sale_price);
    if (updateData.mileage) updateData.mileage = parseInt(updateData.mileage);
    if (updateData.monthly_payment) updateData.monthly_payment = parseFloat(updateData.monthly_payment);
    if (updateData.number_of_owners) updateData.number_of_owners = parseInt(updateData.number_of_owners);

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

export const deleteVehicle = async (id) => {
  try {
    // Get vehicle to find associated images
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('images')
      .eq('id', id)
      .single();
    
    // Delete associated images from storage
    if (vehicle?.images && vehicle.images.length > 0) {
      const filenames = vehicle.images.map(img => {
        const url = img.url || img;
        return url.split('/').pop();
      }).filter(Boolean);
      
      if (filenames.length > 0) {
        await supabase.storage
          .from('vehicle-images')
          .remove(filenames);
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
    // Prepare appointment data with proper field mapping
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
export const getVehicleAnalytics = async (vehicleId) => {
  const { data, error } = await supabase
    .from('vehicle_analytics')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  return { data, error };
};

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
  if (typeof imageObj === 'string') return imageObj;
  if (imageObj.url) return imageObj.url;
  if (imageObj.publicUrl) return imageObj.publicUrl;
  
  return fallback;
};

// Helper function to ensure storage bucket exists and is public
export const ensureStorageBucket = async () => {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const vehicleImagesBucket = buckets?.find(bucket => bucket.name === 'vehicle-images');
    
    if (!vehicleImagesBucket) {
      // Create bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket('vehicle-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating storage bucket:', error);
      }
    }
  } catch (error) {
    console.error('Error checking storage bucket:', error);
  }
};