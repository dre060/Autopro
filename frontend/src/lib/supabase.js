// frontend/src/lib/supabase.js - STORAGE CONFIGURATION FIX
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// FIXED: Storage bucket setup and policies
export const setupStorageBucket = async () => {
  try {
    console.log('Setting up storage bucket...');
    
    // 1. Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError };
    }
    
    console.log('Existing buckets:', buckets);
    
    const vehicleBucket = buckets?.find(b => b.name === 'vehicle-images');
    
    if (!vehicleBucket) {
      console.log('Creating vehicle-images bucket...');
      
      // 2. Create bucket with correct settings
      const { data: createData, error: createError } = await supabase.storage.createBucket('vehicle-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return { success: false, error: createError };
      }
      
      console.log('Bucket created successfully:', createData);
    } else {
      console.log('Bucket already exists:', vehicleBucket);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Setup error:', error);
    return { success: false, error };
  }
};

// FIXED: Image upload with better error handling and verification
export const uploadVehicleImages = async (images) => {
  try {
    console.log('Starting image upload process...');
    
    // Ensure bucket is set up
    const setupResult = await setupStorageBucket();
    if (!setupResult.success) {
      throw new Error('Failed to setup storage bucket: ' + setupResult.error?.message);
    }
    
    const imageUrls = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Processing image ${i + 1}:`, {
        name: image.name,
        size: image.size,
        type: image.type
      });
      
      // Validate file
      if (!image.type.startsWith('image/')) {
        console.error('Invalid file type:', image.type);
        continue;
      }
      
      if (image.size > 10485760) { // 10MB
        console.error('File too large:', image.size);
        continue;
      }
      
      // Generate unique filename
      const fileExt = image.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2);
      const fileName = `${timestamp}-${randomStr}.${fileExt}`;
      
      console.log(`Uploading as: ${fileName}`);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        });
      
      if (uploadError) {
        console.error(`Upload error for ${fileName}:`, uploadError);
        continue;
      }
      
      console.log('Upload successful:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);
      
      console.log('Generated URL:', urlData.publicUrl);
      
      // Verify the URL works
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.error('URL verification failed:', response.status, response.statusText);
          // Try to delete the uploaded file
          await supabase.storage.from('vehicle-images').remove([fileName]);
          continue;
        }
        console.log('URL verified successfully');
      } catch (verifyError) {
        console.error('URL verification error:', verifyError);
        continue;
      }
      
      imageUrls.push({
        url: urlData.publicUrl,
        alt: `Vehicle Image ${i + 1}`,
        isPrimary: i === 0,
        fileName: fileName
      });
    }
    
    console.log(`Successfully uploaded ${imageUrls.length} images`);
    return { data: imageUrls, error: null };
    
  } catch (error) {
    console.error('Error in uploadVehicleImages:', error);
    return { data: null, error };
  }
};

// FIXED: Test function with better debugging
export const testImageUpload = async () => {
  try {
    console.log('=== STARTING IMAGE UPLOAD TEST ===');
    
    // 1. Test bucket setup
    console.log('1. Testing bucket setup...');
    const setupResult = await setupStorageBucket();
    console.log('Bucket setup result:', setupResult);
    
    // 2. Create test image
    console.log('2. Creating test image...');
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Draw a test pattern
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(0, 0, 300, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('TEST IMAGE', 100, 100);
    ctx.fillText(new Date().toLocaleTimeString(), 80, 130);
    
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        try {
          const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
          console.log('Created test file:', {
            name: testFile.name,
            size: testFile.size,
            type: testFile.type
          });
          
          // 3. Test upload
          console.log('3. Testing upload...');
          const result = await uploadVehicleImages([testFile]);
          
          if (result.error) {
            console.error('Upload test failed:', result.error);
            resolve({ success: false, error: result.error });
            return;
          }
          
          console.log('Upload test successful:', result.data);
          
          // 4. Test image loading
          if (result.data && result.data.length > 0) {
            const imageUrl = result.data[0].url;
            console.log('4. Testing image loading...');
            
            const img = new Image();
            img.onload = () => {
              console.log('✅ Image loaded successfully!');
              resolve({ 
                success: true, 
                imageUrl,
                message: 'Image upload and loading test successful!'
              });
            };
            img.onerror = (error) => {
              console.error('❌ Image failed to load:', error);
              resolve({ 
                success: false, 
                error: 'Image uploaded but failed to load',
                imageUrl
              });
            };
            img.src = imageUrl;
            
            // Timeout after 10 seconds
            setTimeout(() => {
              resolve({ 
                success: false, 
                error: 'Image load timeout',
                imageUrl
              });
            }, 10000);
          } else {
            resolve({ success: false, error: 'No images uploaded' });
          }
          
        } catch (error) {
          console.error('Test error:', error);
          resolve({ success: false, error: error.message });
        }
      }, 'image/png');
    });
    
  } catch (error) {
    console.error('Test setup error:', error);
    return { success: false, error: error.message };
  }
};

// FIXED: Check storage configuration
export const checkStorageConfig = async () => {
  try {
    console.log('=== CHECKING STORAGE CONFIGURATION ===');
    
    // 1. List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError };
    }
    
    console.log('Available buckets:', buckets);
    
    // 2. Check vehicle-images bucket
    const vehicleBucket = buckets?.find(b => b.name === 'vehicle-images');
    if (!vehicleBucket) {
      console.log('❌ vehicle-images bucket not found');
      return { success: false, error: 'vehicle-images bucket not found' };
    }
    
    console.log('✅ vehicle-images bucket found:', vehicleBucket);
    
    // 3. Test bucket access
    try {
      const { data: files, error: listFilesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 5 });
      
      if (listFilesError) {
        console.error('Error accessing bucket:', listFilesError);
        return { success: false, error: listFilesError };
      }
      
      console.log('✅ Bucket accessible, files:', files);
      
      // 4. Test a sample file URL if any exist
      if (files && files.length > 0) {
        const sampleFile = files[0];
        const { data: urlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(sampleFile.name);
        
        console.log('Sample file URL:', urlData.publicUrl);
        
        // Test URL accessibility
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log('URL test response:', response.status, response.statusText);
          
          if (response.ok) {
            console.log('✅ Storage URLs are accessible');
          } else {
            console.log('❌ Storage URLs are not accessible');
            return { 
              success: false, 
              error: `URLs not accessible: ${response.status} ${response.statusText}` 
            };
          }
        } catch (fetchError) {
          console.error('URL fetch error:', fetchError);
          return { success: false, error: 'URL fetch failed' };
        }
      }
      
      return { success: true, bucket: vehicleBucket, fileCount: files.length };
      
    } catch (accessError) {
      console.error('Bucket access error:', accessError);
      return { success: false, error: accessError };
    }
    
  } catch (error) {
    console.error('Configuration check error:', error);
    return { success: false, error };
  }
};

// FIXED: Helper to get proper image URL
export const getImageUrl = (imageObj, fallback = "/hero.jpg") => {
  if (!imageObj) return fallback;
  
  if (typeof imageObj === 'string') {
    // Validate URL format
    if (imageObj.includes('supabase.co/storage/v1/object/public/')) {
      return imageObj;
    }
    return fallback;
  }
  
  if (imageObj.url) {
    if (imageObj.url.includes('supabase.co/storage/v1/object/public/')) {
      return imageObj.url;
    }
  }
  
  if (imageObj.publicUrl) {
    if (imageObj.publicUrl.includes('supabase.co/storage/v1/object/public/')) {
      return imageObj.publicUrl;
    }
  }
  
  return fallback;
};