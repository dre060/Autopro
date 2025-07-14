// frontend/src/app/admin/debug-images/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function DebugImages() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      console.log('Raw vehicle data from database:', data);
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const testImageUpload = async () => {
    try {
      console.log('Testing image upload...');
      
      // Create a test canvas image
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // Draw a simple test image
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(0, 0, 300, 200);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText('TEST IMAGE', 100, 100);
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'test-image.png', { type: 'image/png' });
        
        // Test direct upload to storage
        const fileName = `test-${Date.now()}.png`;
        const { data, error } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, file);
        
        if (error) {
          console.error('Upload error:', error);
          alert('Upload failed: ' + error.message);
        } else {
          console.log('Upload success:', data);
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          console.log('Public URL:', urlData.publicUrl);
          alert('Upload successful! Check console for details.');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Test upload error:', error);
      alert('Test failed: ' + error.message);
    }
  };

  const checkBucket = async () => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets);
      
      if (buckets) {
        const vehicleBucket = buckets.find(b => b.name === 'vehicle-images');
        if (vehicleBucket) {
          console.log('Vehicle images bucket exists:', vehicleBucket);
          
          // List files in bucket
          const { data: files, error: listError } = await supabase.storage
            .from('vehicle-images')
            .list('', { limit: 10 });
          
          console.log('Files in bucket:', files);
        } else {
          console.log('Vehicle images bucket does not exist');
        }
      }
    } catch (error) {
      console.error('Error checking bucket:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Debug Vehicle Images</h1>
        
        <div className="mb-8 space-x-4">
          <button
            onClick={testImageUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Image Upload
          </button>
          <button
            onClick={checkBucket}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Check Storage Bucket
          </button>
          <button
            onClick={fetchVehicles}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Refresh Vehicles
          </button>
        </div>

        {loading ? (
          <div>Loading vehicles...</div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Recent Vehicles ({vehicles.length})</h2>
            
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-lg mb-2">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p><strong>ID:</strong> {vehicle.id}</p>
                    <p><strong>Stock:</strong> {vehicle.stock_number}</p>
                    <p><strong>Created:</strong> {new Date(vehicle.created_at).toLocaleString()}</p>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Images Data Structure:</h4>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(vehicle.images, null, 2)}
                      </pre>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Images Type & Length:</h4>
                      <p>Type: {typeof vehicle.images}</p>
                      <p>Is Array: {Array.isArray(vehicle.images) ? 'Yes' : 'No'}</p>
                      <p>Length: {vehicle.images?.length || 0}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Image Preview:</h4>
                    {vehicle.images && vehicle.images.length > 0 ? (
                      <div className="space-y-2">
                        {vehicle.images.map((img, index) => (
                          <div key={index} className="border p-2 rounded">
                            <p className="text-xs mb-1">Image {index + 1}:</p>
                            <p className="text-xs text-gray-600 break-all">
                              URL: {typeof img === 'string' ? img : img.url || 'No URL'}
                            </p>
                            {(typeof img === 'string' ? img : img.url) && (
                              <img
                                src={typeof img === 'string' ? img : img.url}
                                alt={`Vehicle ${index + 1}`}
                                className="w-32 h-24 object-cover mt-2 rounded"
                                onError={(e) => {
                                  console.error('Image load error:', e.target.src);
                                  e.target.style.display = 'none';
                                }}
                                onLoad={() => console.log('Image loaded successfully:', typeof img === 'string' ? img : img.url)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">No images found</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}