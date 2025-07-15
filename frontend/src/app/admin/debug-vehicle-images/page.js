// frontend/src/app/admin/debug-vehicle-images/page.js - COMPREHENSIVE IMAGE DEBUG
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { 
  checkStorageConfig, 
  getVehicles,
  supabase,
  ensureStorageBucket
} from "@/lib/supabase";

export default function DebugVehicleImages() {
  const [vehicles, setVehicles] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [urlTests, setUrlTests] = useState({});

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    setLoading(true);
    
    try {
      console.log('🔍 Loading debug data...');
      
      // Check storage configuration
      const storageResult = await checkStorageConfig();
      setStorageInfo(storageResult);
      console.log('Storage info:', storageResult);
      
      // Get all vehicles
      const vehiclesResult = await getVehicles();
      if (vehiclesResult.data) {
        setVehicles(vehiclesResult.data);
        console.log('Vehicles loaded:', vehiclesResult.data);
        
        // Test each vehicle's image URLs
        const urlTestResults = {};
        for (const vehicle of vehiclesResult.data) {
          if (vehicle.images && vehicle.images.length > 0) {
            urlTestResults[vehicle.id] = await testVehicleImageUrls(vehicle);
          }
        }
        setUrlTests(urlTestResults);
      }
      
    } catch (error) {
      console.error('❌ Error loading debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testVehicleImageUrls = async (vehicle) => {
    const results = [];
    
    for (let i = 0; i < vehicle.images.length; i++) {
      const image = vehicle.images[i];
      const result = {
        index: i,
        url: image.url,
        isPrimary: image.isPrimary,
        isFallback: image.isFallback,
        accessible: false,
        status: null,
        error: null
      };
      
      try {
        console.log(`🧪 Testing URL ${i + 1} for vehicle ${vehicle.id}:`, image.url);
        
        if (image.url === '/hero.jpg') {
          result.accessible = true;
          result.status = 'Fallback image';
        } else {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(image.url, { 
            method: 'HEAD',
            signal: controller.signal 
          });
          
          clearTimeout(timeoutId);
          result.accessible = response.ok;
          result.status = `${response.status} ${response.statusText}`;
        }
        
      } catch (error) {
        result.error = error.message;
        console.warn(`⚠️ URL test failed for vehicle ${vehicle.id}:`, error.message);
      }
      
      results.push(result);
    }
    
    return results;
  };

  const testDirectStorageAccess = async () => {
    try {
      console.log('🧪 Testing direct storage access...');
      
      // List files in storage
      const { data: files, error } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 20 });
      
      if (error) {
        alert(`Storage list error: ${error.message}`);
        return;
      }
      
      console.log('📁 Files in storage:', files);
      
      if (files && files.length > 0) {
        // Test a few URLs
        for (let i = 0; i < Math.min(3, files.length); i++) {
          const file = files[i];
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(file.name);
          
          console.log(`🔗 Testing storage URL ${i + 1}:`, publicUrl);
          
          try {
            const response = await fetch(publicUrl, { method: 'HEAD' });
            console.log(`📡 Response: ${response.status} ${response.statusText}`);
          } catch (fetchError) {
            console.error(`❌ Fetch error:`, fetchError);
          }
        }
        
        alert(`Found ${files.length} files in storage. Check console for URL test results.`);
      } else {
        alert('No files found in storage bucket');
      }
      
    } catch (error) {
      console.error('❌ Direct storage test error:', error);
      alert(`Storage test error: ${error.message}`);
    }
  };

  const repairStorageBucket = async () => {
    try {
      console.log('🔧 Repairing storage bucket...');
      
      const result = await ensureStorageBucket();
      console.log('Repair result:', result);
      
      if (result.success) {
        alert('Storage bucket repaired successfully!');
        loadDebugData(); // Reload data
      } else {
        alert(`Storage repair failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Storage repair error:', error);
      alert(`Storage repair error: ${error.message}`);
    }
  };

  const getStatusColor = (test) => {
    if (!test) return 'text-gray-500';
    if (test.accessible) return 'text-green-600';
    if (test.isFallback) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (test) => {
    if (!test) return '⏳';
    if (test.accessible) return '✅';
    if (test.isFallback) return '🔄';
    return '❌';
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Vehicle Images Debug Center
          </h1>
          <p className="text-gray-600">
            Comprehensive debugging tools for vehicle image issues
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">🛠️ Debug Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadDebugData}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '🔄 Loading...' : '🔍 Reload Debug Data'}
            </button>
            
            <button
              onClick={testDirectStorageAccess}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              🗂️ Test Storage Access
            </button>
            
            <button
              onClick={repairStorageBucket}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              🔧 Repair Storage Bucket
            </button>
          </div>
        </div>

        {/* Storage Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Storage Configuration</h2>
          
          {storageInfo ? (
            <div className={`p-4 rounded-lg ${storageInfo.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-2xl ${storageInfo.success ? 'text-green-600' : 'text-red-600'}`}>
                  {storageInfo.success ? '✅' : '❌'}
                </span>
                <span className={`font-semibold ${storageInfo.success ? 'text-green-800' : 'text-red-800'}`}>
                  {storageInfo.message}
                </span>
              </div>
              
              {storageInfo.success && (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Bucket:</strong> {storageInfo.bucket?.name}</p>
                    <p><strong>Public:</strong> {storageInfo.bucket?.public ? 'Yes' : 'No'}</p>
                    <p><strong>Files:</strong> {storageInfo.fileCount}</p>
                  </div>
                  <div>
                    {storageInfo.bucket?.url && (
                      <p><strong>Base URL:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{storageInfo.bucket.url}</code></p>
                    )}
                    {storageInfo.sampleUrl && (
                      <p><strong>Sample URL:</strong> <a href={storageInfo.sampleUrl} target="_blank" className="text-blue-600 hover:underline text-xs break-all">{storageInfo.sampleUrl}</a></p>
                    )}
                  </div>
                </div>
              )}
              
              {storageInfo.error && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                  <p className="text-red-800 text-sm"><strong>Error:</strong> {storageInfo.error}</p>
                </div>
              )}
              
              {storageInfo.files && storageInfo.files.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Recent Files:</p>
                  <div className="space-y-1">
                    {storageInfo.files.map((file, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                        <span>{file.name}</span>
                        <span className="text-gray-500">{Math.round(file.metadata?.size / 1024) || '?'}KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Click "Reload Debug Data" to check storage configuration
            </div>
          )}
        </div>

        {/* Vehicle Images Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">🚗 Vehicle Images Analysis</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No vehicles found
            </div>
          ) : (
            <div className="space-y-6">
              {vehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-500">ID: {vehicle.id}</p>
                      <p className="text-sm text-gray-500">Stock: {vehicle.stock_number || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Images: {vehicle.images?.length || 0}</p>
                    </div>
                  </div>
                  
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <div className="space-y-3">
                      {vehicle.images.map((image, imgIndex) => {
                        const test = urlTests[vehicle.id]?.[imgIndex];
                        
                        return (
                          <div key={imgIndex} className="bg-gray-50 rounded p-3">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-20 h-16 bg-gray-200 rounded overflow-hidden">
                                <img
                                  src={image.url}
                                  alt={image.alt}
                                  className="w-full h-full object-cover"
                                  onLoad={() => console.log(`✅ Image preview loaded: ${image.url}`)}
                                  onError={(e) => {
                                    console.error(`❌ Image preview failed: ${image.url}`);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="w-full h-full bg-red-100 hidden items-center justify-center">
                                  <span className="text-red-600 text-xs">❌</span>
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{getStatusIcon(test)}</span>
                                  <span className="font-medium">Image {imgIndex + 1}</span>
                                  {image.isPrimary && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Primary</span>}
                                  {image.isFallback && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Fallback</span>}
                                </div>
                                
                                <div className="space-y-1 text-sm">
                                  <p><strong>URL:</strong> <code className="text-xs bg-gray-100 px-1 rounded break-all">{image.url}</code></p>
                                  <p><strong>Alt:</strong> {image.alt}</p>
                                  {image.fileName && (
                                    <p><strong>File:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{image.fileName}</code></p>
                                  )}
                                  
                                  {test && (
                                    <div className={`mt-2 p-2 rounded ${test.accessible ? 'bg-green-50' : test.isFallback ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                      <p className={`font-medium ${getStatusColor(test)}`}>
                                        Status: {test.status || 'Testing...'}
                                      </p>
                                      {test.error && (
                                        <p className="text-red-600 text-xs mt-1">Error: {test.error}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-2 flex gap-2">
                                  <a
                                    href={image.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-xs underline"
                                  >
                                    🔗 Open URL
                                  </a>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(image.url)}
                                    className="text-gray-600 hover:text-gray-700 text-xs underline"
                                  >
                                    📋 Copy URL
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                      No images found for this vehicle
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-bold text-yellow-800 mb-4">🔧 Troubleshooting Steps</h2>
          <div className="text-sm text-yellow-800 space-y-2">
            <p><strong>1. Check Storage:</strong> Verify that storage configuration shows ✅ status</p>
            <p><strong>2. Test Direct Access:</strong> Use "Test Storage Access" to verify bucket accessibility</p>
            <p><strong>3. Check URLs:</strong> Look for 404 errors in vehicle image status</p>
            <p><strong>4. Verify Bucket:</strong> Ensure bucket is public and properly configured</p>
            <p><strong>5. Check Console:</strong> Open browser dev tools for detailed error logs</p>
            <p><strong>6. Repair if Needed:</strong> Use "Repair Storage Bucket" if issues found</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}