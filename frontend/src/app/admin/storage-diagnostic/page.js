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
  const [fixing, setFixing] = useState(false);

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
  };

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

  // FIXED: Enhanced quick fix function that properly handles broken images
  const quickFixVehicle = async (vehicle) => {
    setFixing(true);
    setError("");
    
    try {
      console.log(`Fixing vehicle ${vehicle.id}...`);
      
      // Step 1: Create a test image
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#1e40af');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      // Add text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 400, 250);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Stock #: ${vehicle.stock_number || 'N/A'}`, 400, 320);
      ctx.fillText(`Price: $${vehicle.price?.toLocaleString() || 'N/A'}`, 400, 370);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      if (!blob) {
        throw new Error('Failed to create image blob');
      }
      
      const fileName = `vehicle-${vehicle.id}-${Date.now()}.jpg`;
      
      console.log(`Uploading ${fileName}...`);
      
      // Step 2: Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Fallback: Use hero.jpg if upload fails
        const fallbackResult = await supabase
          .from('vehicles')
          .update({ 
            images: [{
              url: '/hero.jpg',
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              isPrimary: true
            }]
          })
          .eq('id', vehicle.id);
        
        if (fallbackResult.error) {
          throw fallbackResult.error;
        }
        
        alert(`✅ Added fallback image for ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
        await loadDiagnosticData();
        return;
      }
      
      // Step 3: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);
      
      console.log('Public URL:', publicUrl);
      
      // Step 4: Update vehicle record with proper structure
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
      await loadDiagnosticData();
      
    } catch (error) {
      console.error('Fix error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // FIXED: Fix all broken images with better handling
  const fixAllBrokenImages = async () => {
    setFixResults([]);
    setError("");
    setFixing(true);
    
    try {
      // Find vehicles with broken images
      const vehiclesWithBrokenImages = vehicles.filter(v => {
        if (!v.images || v.images.length === 0) return false;
        return v.images.some(img => {
          // Check if image object exists but has no URL or empty URL
          return !img || !img.url || img.url === '';
        });
      });
      
      console.log(`Found ${vehiclesWithBrokenImages.length} vehicles with broken images`);
      
      if (vehiclesWithBrokenImages.length === 0) {
        alert('No broken images found to fix!');
        return;
      }
      
      if (!confirm(`Fix ${vehiclesWithBrokenImages.length} vehicles with broken images?`)) {
        return;
      }
      
      for (const vehicle of vehiclesWithBrokenImages) {
        console.log(`Fixing vehicle ${vehicle.id}...`);
        
        try {
          // Create placeholder image
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          // Simple gradient background
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
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
          
          const fileName = `vehicle-${vehicle.id}-${Date.now()}.jpg`;
          
          // Upload to Supabase
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });
          
          if (uploadError) {
            throw uploadError;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          // Update vehicle
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
          
          setFixResults(prev => [...prev, {
            vehicleId: vehicle.id,
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            success: true,
            message: 'Successfully fixed'
          }]);
          
        } catch (error) {
          console.error(`Error fixing vehicle ${vehicle.id}:`, error);
          
          // Try fallback image as last resort
          try {
            await supabase
              .from('vehicles')
              .update({ 
                images: [{
                  url: '/hero.jpg',
                  alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                  isPrimary: true
                }]
              })
              .eq('id', vehicle.id);
            
            setFixResults(prev => [...prev, {
              vehicleId: vehicle.id,
              vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              success: true,
              message: 'Used fallback image'
            }]);
          } catch (fallbackError) {
            setFixResults(prev => [...prev, {
              vehicleId: vehicle.id,
              vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              success: false,
              error: error.message
            }]);
          }
        }
      }
      
      // Reload data after fixes
      setTimeout(() => {
        loadDiagnosticData();
      }, 2000);
      
    } catch (error) {
      console.error('Error in fixAllBrokenImages:', error);
      setError(`Failed to fix broken images: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // FIXED: Force fix for specific Toyota Camry
  const forceFix2025Camry = async () => {
    const camry = vehicles.find(v => v.id === '411138ea-874b-42f5-a234-7c8df83d3af3');
    if (!camry) {
      alert('2025 Toyota Camry not found!');
      return;
    }
    
    setFixing(true);
    try {
      console.log('Force fixing 2025 Toyota Camry...');
      
      // Option 1: Try to upload a new image
      try {
        const fileName = `camry-${Date.now()}.jpg`;
        
        // Create a simple test blob
        const response = await fetch('/hero.jpg');
        const blob = await response.blob();
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, blob);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          await supabase
            .from('vehicles')
            .update({ 
              images: [{
                url: publicUrl,
                alt: '2025 Toyota Camry',
                isPrimary: true,
                fileName: fileName
              }]
            })
            .eq('id', camry.id);
          
          alert('✅ Successfully uploaded new image for 2025 Toyota Camry!');
          await loadDiagnosticData();
          return;
        }
      } catch (uploadErr) {
        console.error('Upload attempt failed:', uploadErr);
      }
      
      // Option 2: Force fallback image
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          images: [{
            url: '/hero.jpg',
            alt: '2025 Toyota Camry',
            isPrimary: true
          }]
        })
        .eq('id', camry.id);
      
      if (error) throw error;
      
      alert('✅ Successfully added fallback image to 2025 Toyota Camry!');
      await loadDiagnosticData();
      
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // Clean orphaned files
  const deleteOrphanedFiles = async () => {
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
                return v.images.some(img => !img || !img.url || img.url === '');
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
              disabled={fixing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={fixAllBrokenImages}
              disabled={fixing}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              🔧 Fix All Broken Images
            </button>
            <button
              onClick={deleteOrphanedFiles}
              disabled={fixing}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              🗑️ Clean Orphaned Files
            </button>
            <button
              onClick={forceFix2025Camry}
              disabled={fixing}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              🚗 Force Fix 2025 Camry
            </button>
          </div>
          {fixing && (
            <p className="mt-4 text-blue-600 flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></span>
              Processing...
            </p>
          )}
        </div>

        {/* Fix Results */}
        {fixResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Fix Results</h2>
            <div className="space-y-2">
              {fixResults.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold">{result.vehicle}</p>
                  <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✓' : '✗'} {result.message || result.error}
                  </p>
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
                      return !img || !img.url || img.url === '';
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
                                const hasUrl = img && img.url && img.url !== '';
                                return (
                                  <div key={i} className="text-xs mt-1">
                                    <span className={hasUrl ? 'text-green-600' : 'text-red-600'}>
                                      {hasUrl ? '✓' : '✗'} Image {i + 1}: {hasUrl ? 'Has URL' : 'No URL'}
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
                          {(brokenImageCount > 0 || !hasImages) && (
                            <button
                              onClick={() => quickFixVehicle(vehicle)}
                              disabled={fixing}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Fix Now
                            </button>
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
                        const hasUrl = img && img.url && img.url !== '';
                        return (
                          <div key={i} className="border rounded p-3">
                            <p className="text-sm font-medium">Image {i + 1}:</p>
                            <p className="text-xs text-gray-600 break-all">
                              URL: {hasUrl ? img.url : 'No URL provided'}
                            </p>
                            <p className={`text-sm mt-1 ${hasUrl ? 'text-green-600' : 'text-red-600'}`}>
                              Status: {hasUrl ? 'Has URL' : 'Missing URL'}
                            </p>
                            {hasUrl && (
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
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      quickFixVehicle(selectedVehicle);
                      setSelectedVehicle(null);
                    }}
                    disabled={fixing}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Fix This Vehicle
                  </button>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}