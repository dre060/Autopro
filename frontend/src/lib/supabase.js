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
  if (data) {
    await supabase.rpc('increment_vehicle_views', { vehicle_id: id });
  }
  
  return { data, error };
};

export const createVehicle = async (vehicleData, images = []) => {
  // Upload images first
  const imageUrls = [];
  for (const image of images) {
    const fileName = `${Date.now()}-${image.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_VEHICLE_IMAGES_BUCKET)
      .upload(fileName, image);
    
    if (uploadError) {
      console.error('Image upload error:', uploadError);
      continue;
    }
    
    const { data: urlData } = supabase.storage
      .from(process.env.NEXT_PUBLIC_VEHICLE_IMAGES_BUCKET)
      .getPublicUrl(fileName);
    
    imageUrls.push({
      url: urlData.publicUrl,
      alt: vehicleData.make + ' ' + vehicleData.model,
      isPrimary: imageUrls.length === 0
    });
  }

  // Create vehicle with image URLs
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      ...vehicleData,
      images: imageUrls
    }])
    .select()
    .single();

  return { data, error };
};

export const updateVehicle = async (id, updates, newImages = []) => {
  // Handle new image uploads
  if (newImages.length > 0) {
    const imageUrls = updates.images || [];
    for (const image of newImages) {
      const fileName = `${Date.now()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_VEHICLE_IMAGES_BUCKET)
        .upload(fileName, image);
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(process.env.NEXT_PUBLIC_VEHICLE_IMAGES_BUCKET)
          .getPublicUrl(fileName);
        
        imageUrls.push({
          url: urlData.publicUrl,
          alt: updates.make + ' ' + updates.model,
          isPrimary: imageUrls.length === 0
        });
      }
    }
    updates.images = imageUrls;
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

export const deleteVehicle = async (id) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  return { error };
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
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single();

  return { data, error };
};

export const updateAppointment = async (id, updates) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
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
  const { data, error } = await supabase
    .from('testimonials')
    .insert([testimonialData])
    .select()
    .single();

  return { data, error };
};

// Contact message operations
export const createContactMessage = async (messageData) => {
  const { data, error } = await supabase
    .from('contact_messages')
    .insert([messageData])
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