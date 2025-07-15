// frontend/src/app/admin/storage-diagnostic/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function StorageDiagnostic() {
  const [bucketFiles, setBucketFiles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fixResults, setFixResults] = useState([]);

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      // 1. Get all files from storage bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 1000 });
      
      if (filesError) {
        setError(`Failed to list bucket files: ${filesError.message}`);
      } else {
        setBucketFiles(files || []);
      }

      // 2. Get all vehicles from database
      const { data: vehicleData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (vehiclesError) {
        setError(`Failed to load vehicles: ${vehiclesError.message}`);
      } else {
        setVehicles(vehicleData || []);
      }
    } catch (err) {
      setError(`Diagnostic error: ${err.message}`);
    } finally {
      setLoading(false);
    }

  const checkImageStatus = (imageUrl) => {
    if (!imageUrl) return { status: 'missing', message: 'No URL provided' };
    
    // Handle empty strings
    if (imageUrl === '') return { status: 'missing', message: 'Empty URL' };
    
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Check if file exists in bucket
    const fileExists = bucketFiles.some(file => file.name === filename);
    
    return {
      status: fileExists ? 'exists' : 'not-found',
      message: fileExists ? 'File exists in bucket' : 'File NOT found in bucket',
      filename
    };
  };

  const testImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return {
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        accessible: false,
        status: 0,
        statusText: error.message
      };
    }
  };

  const fixVehicleImages = async (vehicle) => {
    const results = [];
    
    try {
      // Re-upload a test image for this vehicle
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Create a placeholder image with vehicle info
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 400, 300);
      ctx.font = '24px Arial';
      ctx.fillText('Placeholder Image', 400, 350);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const file = new File([blob], `placeholder-${vehicle.id}.jpg`, { type: 'image/jpeg' });
      const fileName = `vehicle-${vehicle.id}-${Date.now()}.jpg`;
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        results.push({
          action: 'upload',
          success: false,
          error: uploadError.message
        });
        return results;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);
      
      // Update vehicle with new image
      const newImage = {
        url: urlData.publicUrl,
        alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        isPrimary: true,
        fileName: fileName
      };
      
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ 
          images: [newImage]
        })
        .eq('id', vehicle.id);
      
      if (updateError) {
        results.push({
          action: 'update',
          success: false,
          error: updateError.message
        });
      } else {
        results.push({
          action: 'complete',
          success: true,
          message: `Fixed vehicle ${vehicle.id} with new placeholder image`,
          newUrl: urlData.publicUrl
        });
      }
      
    } catch (error) {
      results.push({
        action: 'error',
        success: false,
        error: error.message
      });
    }
    
    return results;
  };

  const fixAllBrokenImages = async () => {
    setFixResults([]);
    setError("");
    
    try {
      console.log('Starting fix for broken images...');
      
      // Find vehicles with broken images
      const vehiclesWithBrokenImages = vehicles.filter(v => {
        if (!v.images || v.images.length === 0) return false;
        return v.images.some(img => {
          if (!img || !img.url || img.url === '') return true;
          const status = checkImageStatus(img.url);
          return status.status === 'not-found' || status.status === 'missing';
        });
      });
      
      console.log(`Found ${vehiclesWithBrokenImages.length} vehicles with broken images`);
      
      if (vehiclesWithBrokenImages.length === 0) {
        alert('No broken images found to fix!');
        return;
      }
      
      for (const vehicle of vehiclesWithBrokenImages) {
        console.log(`Fixing images for vehicle ${vehicle.id}...`);
        
        try {
          // Create a simple test image
          const fileName = `vehicle-${vehicle.id}-${Date.now()}.jpg`;
          
          // Create a blob directly using fetch from a data URL
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          // Create gradient background
          const gradient = ctx.createLinearGradient(0, 0, 800, 600);
          gradient.addColorStop(0, '#1e3a8a');
          gradient.addColorStop(1, '#3b82f6');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 600);
          
          // Add text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 400, 280);
          ctx.font = '24px Arial';
          ctx.fillText('Placeholder Image', 400, 340);
          
          // Convert to blob
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          console.log(`Created blob of size ${blob.size} bytes`);
          
          // Upload to Supabase
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          console.log('Upload successful:', uploadData);
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          console.log('Public URL:', urlData.publicUrl);
          
          // Update vehicle with new image
          const newImage = {
            url: urlData.publicUrl,
            alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            isPrimary: true,
            fileName: fileName
          };
          
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ 
              images: [newImage]
            })
            .eq('id', vehicle.id);
          
          if (updateError) {
            console.error('Update error:', updateError);
            throw new Error(`Database update failed: ${updateError.message}`);
          }
          
          console.log(`Successfully fixed vehicle ${vehicle.id}`);
          
          setFixResults(prev => [...prev, {
            vehicleId: vehicle.id,
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            results: [{
              action: 'complete',
              success: true,
              message: 'Successfully created placeholder image',
              newUrl: urlData.publicUrl
            }]
          }]);
          
        } catch (error) {
          console.error(`Error fixing vehicle ${vehicle.id}:`, error);
          setFixResults(prev => [...prev, {
            vehicleId: vehicle.id,
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            results: [{
              action: 'error',
              success: false,
              error: error.message
            }]
          }]);
        }
      }
      
      // Reload data after fixes
      setTimeout(() => {
        loadDiagnosticData();
      }, 2000);
      
    } catch (error) {
      console.error('Error in fixAllBrokenImages:', error);
      setError(`Failed to fix broken images: ${error.message}`);
      alert(`Error: ${error.message}`);
    }
  };

  // Add fallback image without upload
  const addFallbackImage = async (vehicle) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          images: [{
            url: '/hero.jpg',
            alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            isPrimary: true
          }]
        })
        .eq('id', vehicle.id);
      
      if (error) throw error;
      
      alert('✅ Added fallback image!');
      loadDiagnosticData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Simple direct fix for a single vehicle
  const quickFixVehicle = async (vehicle) => {
    try {
      console.log(`Quick fixing vehicle ${vehicle.id}...`);
      setError("");
      
      // First, try to upload a new image
      try {
        const fileName = `placeholder-${vehicle.id}-${Date.now()}.jpg`;
        
        // Create a simple colored rectangle as placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Simple blue background
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, 800, 600);
        
        // Add vehicle text
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 400, 300);
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        if (!blob) {
          throw new Error('Failed to create image blob');
        }
        
        console.log(`Uploading ${fileName} (${blob.size} bytes)...`);
        
        // Upload to Supabase
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, blob);
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(fileName);
        
        console.log('Got public URL:', publicUrl);
        
        // Update vehicle record
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ 
            images: [{
              url: publicUrl,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              isPrimary: true,
              fileName: fileName
            }]
          })
          .eq('id', vehicle.id);
        
        if (updateError) {
          throw updateError;
        }
        
        alert(`✅ Successfully fixed images for ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
        
      } catch (uploadError) {
        console.error('Upload failed, using fallback:', uploadError);
        
        // If upload fails, just use the fallback image
        const { error: fallbackError } = await supabase
          .from('vehicles')
          .update({ 
            images: [{
              url: '/hero.jpg',
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              isPrimary: true
            }]
          })
          .eq('id', vehicle.id);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        alert(`✅ Added fallback image for ${vehicle.year} ${vehicle.make} ${vehicle.model} (upload failed)`);
      }
      
      // Reload data
      loadDiagnosticData();
      
    } catch (error) {
      console.error('Quick fix error:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };
    // Find files in bucket that aren't referenced by any vehicle
    const referencedFiles = new Set();
    
    vehicles.forEach(vehicle => {
      if (vehicle.images && Array.isArray(vehicle.images)) {
        vehicle.images.forEach(image => {
          if (image.fileName) {
            referencedFiles.add(image.fileName);
          } else if (image.url) {
            const filename = image.url.split('/').pop();
            referencedFiles.add(filename);
          }
        });
      }
    });
    
    const orphanedFiles = bucketFiles.filter(file => !referencedFiles.has(file.name));
    
    if (orphanedFiles.length === 0) {
      alert('No orphaned files found');
      return;
    }
    
    if (confirm(`Delete ${orphanedFiles.length} orphaned files?`)) {
      const filenames = orphanedFiles.map(f => f.name);
      const { error } = await supabase.storage
        .from('vehicle-images')
        .remove(filenames);
      
      if (error) {
        alert(`Error deleting files: ${error.message}`);
      } else {
        alert(`Deleted ${orphanedFiles.length} orphaned files`);
        await loadDiagnosticData();
      }
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Storage Diagnostic Tool
          </h1>
          <p className="text-gray-600">
            Diagnose and fix image storage issues
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Storage Files</h3>
            <p className="text-3xl font-bold text-blue-600">{bucketFiles.length}</p>
            <p className="text-sm text-gray-500">Files in bucket</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Vehicles</h3>
            <p className="text-3xl font-bold text-green-600">{vehicles.length}</p>
            <p className="text-sm text-gray-500">Total vehicles</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">With Images</h3>
            <p className="text-3xl font-bold text-purple-600">
              {vehicles.filter(v => v.images && v.images.length > 0).length}
            </p>
            <p className="text-sm text-gray-500">Vehicles with images</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Broken Images</h3>
            <p className="text-3xl font-bold text-red-600">
              {vehicles.filter(v => {
                if (!v.images || v.images.length === 0) return false;
                return v.images.some(img => {
                  if (!img.url) return true;
                  const urlParts = img.url.split('/');
                  const filename = urlParts[urlParts.length - 1];
                  const fileExists = bucketFiles.some(file => file.name === filename);
                  return !fileExists;
                });
              }).length}
            </p>
            <p className="text-sm text-gray-500">Vehicles with broken images</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={loadDiagnosticData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={fixAllBrokenImages}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              🔧 Fix All Broken Images
            </button>
            <button
              onClick={deleteOrphanedFiles}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              🗑️ Clean Orphaned Files
            </button>
            <button
              onClick={async () => {
                // Manual fix - add a working test image URL directly
                const vehicle = vehicles.find(v => v.id === '411138ea-874b-42f5-a234-7c8df83d3af3');
                if (!vehicle) {
                  alert('Vehicle not found!');
                  return;
                }
                
                try {
                  const { error } = await supabase
                    .from('vehicles')
                    .update({ 
                      images: [{
                        url: '/hero.jpg',
                        alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                        isPrimary: true
                      }]
                    })
                    .eq('id', vehicle.id);
                  
                  if (error) throw error;
                  
                  alert('✅ Added fallback image to vehicle!');
                  loadDiagnosticData();
                } catch (err) {
                  alert(`Error: ${err.message}`);
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg"
            >
              🚑 Quick Fix Toyota
            </button>
            <button
              onClick={async () => {
                try {
                  const testFile = new File(['test'], 'test-upload.txt', { type: 'text/plain' });
                  const { error } = await supabase.storage
                    .from('vehicle-images')
                    .upload(`test-${Date.now()}.txt`, testFile);
                  
                  if (error) {
                    alert(`Storage test failed: ${error.message}`);
                  } else {
                    alert('✅ Storage is working! You can upload files.');
                    loadDiagnosticData();
                  }
                } catch (err) {
                  alert(`Storage test error: ${err.message}`);
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              🧪 Test Storage
            </button>
          </div>
        </div>

        {/* Fix Results */}
        {fixResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Fix Results</h2>
            <div className="space-y-2">
              {fixResults.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold">{result.vehicle}</p>
                  {result.results.map((r, i) => (
                    <p key={i} className={`text-sm ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                      {r.success ? '✓' : '✗'} {r.message || r.error}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Details */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Vehicle Image Status</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Images
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => {
                    const hasImages = vehicle.images && vehicle.images.length > 0;
                    const brokenImageCount = hasImages ? vehicle.images.filter(img => {
                      if (!img || !img.url || img.url === '') return true;
                      const status = checkImageStatus(img.url);
                      return status.status === 'not-found' || status.status === 'missing';
                    }).length : 0;
                    
                    return (
                      <tr key={vehicle.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {vehicle.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {hasImages ? (
                            <div>
                              <p className="text-sm text-gray-900">
                                {vehicle.images.length} image(s)
                              </p>
                              {vehicle.images.map((img, i) => {
                                const status = checkImageStatus(img?.url);
                                return (
                                  <div key={i} className="text-xs mt-1">
                                    <span className={status.status === 'exists' ? 'text-green-600' : 'text-red-600'}>
                                      {status.status === 'exists' ? '✓' : '✗'} {status.filename || status.message || 'Unknown file'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No images</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!hasImages ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                              No Images
                            </span>
                          ) : brokenImageCount > 0 ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              {brokenImageCount} Broken
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              All Good
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedVehicle(vehicle)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Details
                          </button>
                          {brokenImageCount > 0 && (
                            <>
                              <button
                                onClick={() => addFallbackImage(vehicle)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                                title="Add /hero.jpg as fallback"
                              >
                                Fallback
                              </button>
                              <button
                                onClick={() => quickFixVehicle(vehicle)}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Upload new placeholder"
                              >
                                Fix
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Clear all images for this vehicle?')) {
                                    try {
                                      const { error } = await supabase
                                        .from('vehicles')
                                        .update({ images: [] })
                                        .eq('id', vehicle.id);
                                      
                                      if (error) throw error;
                                      alert('Images cleared');
                                      loadDiagnosticData();
                                    } catch (err) {
                                      alert(`Error: ${err.message}`);
                                    }
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-900"
                                title="Clear all images"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Details Modal */}
        {selectedVehicle && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </h3>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Database Record:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedVehicle.images, null, 2)}
                  </pre>
                </div>
                
                {selectedVehicle.images && selectedVehicle.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Image Analysis:</h4>
                    <div className="space-y-2">
                      {selectedVehicle.images.map((img, i) => {
                        const status = checkImageStatus(img?.url);
                        return (
                          <div key={i} className="border rounded p-3">
                            <p className="text-sm font-medium">Image {i + 1}:</p>
                            <p className="text-xs text-gray-600 break-all">URL: {img?.url || 'No URL'}</p>
                            <p className={`text-sm mt-1 ${status.status === 'exists' ? 'text-green-600' : 'text-red-600'}`}>
                              Status: {status.message}
                            </p>
                            {img?.url && img.url !== '' && (
                              <div className="mt-2">
                                <img 
                                  src={img.url} 
                                  alt="Test" 
                                  className="w-32 h-24 object-cover border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <p className="text-xs text-red-600 mt-1" style={{display: 'none'}}>
                                  Failed to load image
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};