// frontend/src/app/admin/fix-vehicle-data/page.js - FIX VEHICLE IMAGE DATA
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function FixVehicleData() {
  const [vehicles, setVehicles] = useState([]);
  const [storageFiles, setStorageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const analyzeVehicleData = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      console.log('🔍 Analyzing vehicle data...');
      
      // Get all vehicles
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (vehicleError) {
        throw vehicleError;
      }
      
      setVehicles(vehicleData || []);
      
      // Get all storage files
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 100 });
      
      if (filesError) {
        throw filesError;
      }
      
      setStorageFiles(files || []);
      
      // Analyze each vehicle
      const analysis = [];
      
      for (const vehicle of vehicleData || []) {
        const result = {
          id: vehicle.id,
          name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          stockNumber: vehicle.stock_number,
          rawImages: vehicle.images,
          rawImageType: typeof vehicle.images,
          processedImages: [],
          hasValidImages: false,
          needsRepair: false,
          suggestedFix: null
        };
        
        // Check current image data
        if (!vehicle.images) {
          result.needsRepair = true;
          result.suggestedFix = 'No images field - needs image assignment';
        } else {
          try {
            let imageArray = [];
            
            if (Array.isArray(vehicle.images)) {
              imageArray = vehicle.images;
            } else if (typeof vehicle.images === 'string') {
              imageArray = JSON.parse(vehicle.images);
            } else if (typeof vehicle.images === 'object') {
              imageArray = [vehicle.images];
            }
            
            result.processedImages = imageArray;
            
            // Check if any images have valid URLs
            const hasValidUrls = imageArray.some(img => {
              const url = typeof img === 'string' ? img : img?.url;
              return url && url !== '/hero.jpg' && url.includes('supabase.co');
            });
            
            result.hasValidImages = hasValidUrls;
            
            if (!hasValidUrls) {
              result.needsRepair = true;
              result.suggestedFix = 'Has image data but no valid Supabase URLs';
            }
            
          } catch (e) {
            result.needsRepair = true;
            result.suggestedFix = 'Image data is malformed JSON';
          }
        }
        
        analysis.push(result);
      }
      
      setResults(analysis);
      console.log('Analysis complete:', analysis);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignImagesToVehicle = async (vehicleId, vehicleName) => {
    try {
      console.log(`🔧 Assigning images to vehicle ${vehicleId}...`);
      
      // For this demo, let's assign the first available storage image
      if (storageFiles.length === 0) {
        alert('No images in storage to assign');
        return;
      }
      
      // Use the first available image file
      const file = storageFiles[0];
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(file.name);
      
      const imageData = [{
        url: publicUrl,
        alt: vehicleName,
        isPrimary: true,
        fileName: file.name
      }];
      
      console.log('Assigning image data:', imageData);
      
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          images: imageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);
      
      if (error) {
        throw error;
      }
      
      alert(`✅ Successfully assigned image to ${vehicleName}`);
      
      // Refresh analysis
      analyzeVehicleData();
      
    } catch (error) {
      console.error('❌ Image assignment error:', error);
      alert(`Failed to assign image: ${error.message}`);
    }
  };

  const syncDatabaseWithStorage = async () => {
    if (!confirm('This will update vehicle records to use the actual files in storage. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('🔄 Syncing database with storage...');
      
      // Get all available storage files
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 100 });
      
      if (filesError) {
        throw filesError;
      }
      
      console.log('Available files in storage:', files);
      
      if (files.length === 0) {
        alert('No files found in storage to sync');
        return;
      }
      
      // Get all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');
      
      if (vehiclesError) {
        throw vehiclesError;
      }
      
      const syncResults = [];
      
      // Assign files to vehicles
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        
        // Use files in rotation
        const fileIndex = i % files.length;
        const file = files[fileIndex];
        
        console.log(`Syncing vehicle ${i + 1}/${vehicles.length}: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
        console.log(`Assigning file: ${file.name}`);
        
        // Generate public URL for the actual file
        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(file.name);
        
        console.log(`Generated URL: ${publicUrl}`);
        
        // Test the URL to make sure it works
        try {
          const testResponse = await fetch(publicUrl, { method: 'HEAD' });
          console.log(`URL test for ${file.name}: ${testResponse.status}`);
          
          if (testResponse.ok) {
            // Create proper image data
            const imageData = [{
              url: publicUrl,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              isPrimary: true,
              fileName: file.name
            }];
            
            // Update vehicle record
            const { error: updateError } = await supabase
              .from('vehicles')
              .update({ 
                images: imageData,
                updated_at: new Date().toISOString()
              })
              .eq('id', vehicle.id);
            
            if (updateError) {
              throw updateError;
            }
            
            syncResults.push({
              vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              file: file.name,
              url: publicUrl,
              status: '✅ Success'
            });
            
          } else {
            syncResults.push({
              vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              file: file.name,
              url: publicUrl,
              status: `❌ URL test failed: ${testResponse.status}`
            });
          }
          
        } catch (testError) {
          syncResults.push({
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            file: file.name,
            url: publicUrl,
            status: `❌ URL test error: ${testError.message}`
          });
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('Sync results:', syncResults);
      
      // Show results
      const successCount = syncResults.filter(r => r.status.includes('✅')).length;
      alert(`✅ Sync complete! Successfully synced ${successCount}/${syncResults.length} vehicles.\n\nCheck console for detailed results.`);
      
      // Refresh analysis
      analyzeVehicleData();
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testVehicleImageUrls = async () => {
    console.log('🧪 Testing all vehicle image URLs...');
    
    for (const result of results) {
      if (result.processedImages && result.processedImages.length > 0) {
        for (const img of result.processedImages) {
          const url = typeof img === 'string' ? img : img?.url;
          
          if (url && url !== '/hero.jpg') {
            try {
              const response = await fetch(url, { method: 'HEAD' });
              console.log(`${result.name} - ${url}: ${response.status}`);
            } catch (e) {
              console.error(`${result.name} - ${url}: ERROR - ${e.message}`);
            }
          }
        }
      }
    }
    
    alert('✅ URL test complete - check console for results');
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🔧 Fix Vehicle Image Data</h1>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-2">🚨 Common Issue: 404 Image Errors</h2>
          <div className="text-red-700 text-sm space-y-2">
            <p>
              <strong>Problem:</strong> Vehicle records show "Valid Images" but you still see 404 errors when loading the page.
            </p>
            <p>
              <strong>Cause:</strong> Database URLs point to files that were deleted or renamed in storage.
            </p>
            <p>
              <strong>Solution:</strong> Click <strong>"🔄 Sync with Storage"</strong> to update all vehicle records to use the actual files in storage.
            </p>
          </div>
        </div>
          <h2 className="font-semibold text-yellow-800 mb-2">🔍 What This Does</h2>
          <div className="text-yellow-700 text-sm space-y-2">
            <p>
              This tool analyzes vehicle records in your database and identifies which ones have missing or invalid image data.
            </p>
            <p>
              <strong>🔄 Sync with Storage:</strong> Updates all vehicle records to use the actual files currently in your Supabase storage bucket.
              This fixes the common issue where database URLs point to files that no longer exist.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Analysis & Repair Tools</h2>
            <div className="flex gap-2">
              <button
                onClick={analyzeVehicleData}
                disabled={loading}
                className={`px-4 py-2 rounded font-semibold text-white ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? '🔄 Analyzing...' : '🔍 Analyze Vehicle Data'}
              </button>
              
              {results.length > 0 && (
                <>
                  <button
                    onClick={testVehicleImageUrls}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold"
                  >
                    🧪 Test URLs
                  </button>
                  
                  <button
                    onClick={syncDatabaseWithStorage}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
                  >
                    🔄 Sync with Storage
                  </button>
                </>
              )}
            </div>
          </div>
          
          {storageFiles.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-sm">
                📁 Found {storageFiles.length} images in storage that can be assigned to vehicles
              </p>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📊 Vehicle Analysis Results</h2>
            
            <div className="mb-4 grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.hasValidImages).length}
                </div>
                <div className="text-green-700">Vehicles with Valid Images</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.needsRepair).length}
                </div>
                <div className="text-red-700">Vehicles Needing Repair</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.length}
                </div>
                <div className="text-blue-700">Total Vehicles</div>
              </div>
            </div>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={result.id} className={`border rounded p-4 ${
                  result.needsRepair ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{result.name}</h3>
                      <p className="text-sm text-gray-600">
                        ID: {result.id} | Stock: {result.stockNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        result.hasValidImages 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.hasValidImages ? '✅ Valid Images' : '❌ Needs Repair'}
                      </span>
                      
                      {result.needsRepair && (
                        <button
                          onClick={() => assignImagesToVehicle(result.id, result.name)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          🔧 Fix
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Raw Image Type:</strong> {result.rawImageType}</p>
                      <p><strong>Processed Images:</strong> {result.processedImages.length}</p>
                      {result.suggestedFix && (
                        <p className="text-red-600"><strong>Issue:</strong> {result.suggestedFix}</p>
                      )}
                    </div>
                    <div>
                      <p><strong>Raw Data:</strong></p>
                      <div className="bg-gray-100 p-2 rounded text-xs break-all max-h-20 overflow-y-auto">
                        {JSON.stringify(result.rawImages, null, 2)}
                      </div>
                    </div>
                  </div>
                  
                  {result.processedImages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Processed Images:</p>
                      <div className="space-y-1">
                        {result.processedImages.map((img, imgIndex) => {
                          const url = typeof img === 'string' ? img : img?.url;
                          const isValid = url && url !== '/hero.jpg' && url.includes('supabase.co');
                          
                          return (
                            <div key={imgIndex} className={`text-xs p-2 rounded ${
                              isValid ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              <span className={isValid ? 'text-green-700' : 'text-yellow-700'}>
                                {imgIndex + 1}. {url || 'No URL'} {isValid ? '✅' : '⚠️'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-bold mb-4">💡 Understanding the Results</h2>
          <div className="text-sm space-y-2 text-gray-700">
            <p><strong>✅ Valid Images:</strong> Vehicle has proper Supabase image URLs that are accessible</p>
            <p><strong>❌ Needs Repair:</strong> Vehicle has no images or URLs pointing to missing files</p>
            <p><strong>🔄 Sync with Storage:</strong> Updates ALL vehicles to use actual files in storage (RECOMMENDED)</p>
            <p><strong>🔧 Fix Button:</strong> Assigns an available storage image to a specific vehicle</p>
            <p><strong>🧪 Test URLs:</strong> Checks if all image URLs are accessible (see console)</p>
            <p className="bg-blue-50 p-2 rounded mt-3"><strong>💡 Tip:</strong> If you see "Valid Images" but still get 404 errors, use "Sync with Storage" to fix URL mismatches.</p>
          </div>
          </div>
    </AdminLayout>
  );
}