// frontend/src/app/admin/image-debug/page.js - REAL-TIME IMAGE DEBUGGING
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { supabase, getVehicles } from "@/lib/supabase";

export default function ImageDebugTool() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await getVehicles({ limit: 50 });
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeVehicleImages = async (vehicle) => {
    if (!vehicle) return;
    
    setAnalyzing(true);
    setSelectedVehicle(vehicle);
    
    try {
      console.log('🔍 ANALYZING VEHICLE:', vehicle.id, vehicle.year, vehicle.make, vehicle.model);
      
      const analysisResult = {
        vehicleInfo: {
          id: vehicle.id,
          name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          created: vehicle.created_at,
          updated: vehicle.updated_at
        },
        rawImages: vehicle.images,
        rawImagesType: typeof vehicle.images,
        imageCount: Array.isArray(vehicle.images) ? vehicle.images.length : 0,
        processedImages: [],
        urlTests: [],
        errors: [],
        warnings: []
      };

      // Analyze raw images data
      console.log('📷 Raw images data:', vehicle.images);
      
      if (!vehicle.images) {
        analysisResult.errors.push('No images data found');
      } else if (Array.isArray(vehicle.images)) {
        console.log('✅ Images is array with', vehicle.images.length, 'items');
        
        // Process each image
        for (let i = 0; i < vehicle.images.length; i++) {
          const img = vehicle.images[i];
          console.log(`📷 Processing image ${i + 1}:`, img);
          
          const imageAnalysis = {
            index: i,
            raw: img,
            type: typeof img,
            url: null,
            isPrimary: false,
            isValid: false,
            loadTest: null,
            fetchTest: null,
            errors: []
          };

          // Extract URL
          if (typeof img === 'string') {
            imageAnalysis.url = img;
          } else if (img && typeof img === 'object') {
            imageAnalysis.url = img.url || img.publicUrl || img.src;
            imageAnalysis.isPrimary = img.isPrimary || false;
          }

          if (!imageAnalysis.url) {
            imageAnalysis.errors.push('No URL found');
          } else {
            console.log(`🔗 Testing URL ${i + 1}:`, imageAnalysis.url);
            
            // Test URL with fetch
            try {
              const fetchResponse = await fetch(imageAnalysis.url, { method: 'HEAD' });
              imageAnalysis.fetchTest = {
                status: fetchResponse.status,
                statusText: fetchResponse.statusText,
                ok: fetchResponse.ok,
                headers: {
                  'content-type': fetchResponse.headers.get('content-type'),
                  'content-length': fetchResponse.headers.get('content-length'),
                  'cache-control': fetchResponse.headers.get('cache-control')
                }
              };
              console.log(`📡 Fetch test ${i + 1}:`, imageAnalysis.fetchTest);
            } catch (fetchError) {
              imageAnalysis.fetchTest = {
                error: fetchError.message,
                ok: false
              };
              imageAnalysis.errors.push(`Fetch failed: ${fetchError.message}`);
              console.error(`❌ Fetch error ${i + 1}:`, fetchError);
            }

            // Test image loading in browser
            try {
              const loadResult = await new Promise((resolve) => {
                const img = new Image();
                const timeout = setTimeout(() => {
                  resolve({
                    success: false,
                    error: 'Timeout after 5 seconds',
                    naturalWidth: 0,
                    naturalHeight: 0
                  });
                }, 5000);

                img.onload = () => {
                  clearTimeout(timeout);
                  resolve({
                    success: true,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    complete: img.complete
                  });
                };

                img.onerror = (error) => {
                  clearTimeout(timeout);
                  resolve({
                    success: false,
                    error: 'Image load error',
                    naturalWidth: 0,
                    naturalHeight: 0
                  });
                };

                img.src = imageAnalysis.url;
              });

              imageAnalysis.loadTest = loadResult;
              console.log(`🖼️ Load test ${i + 1}:`, loadResult);
            } catch (loadError) {
              imageAnalysis.loadTest = {
                success: false,
                error: loadError.message
              };
              imageAnalysis.errors.push(`Load failed: ${loadError.message}`);
            }

            // Determine if image is valid
            imageAnalysis.isValid = imageAnalysis.fetchTest?.ok && imageAnalysis.loadTest?.success;
          }

          analysisResult.processedImages.push(imageAnalysis);
        }
      } else if (typeof vehicle.images === 'string') {
        analysisResult.warnings.push('Images data is string - attempting JSON parse');
        try {
          const parsed = JSON.parse(vehicle.images);
          analysisResult.warnings.push('JSON parse successful');
          // Would need to recursively analyze parsed data
        } catch (parseError) {
          analysisResult.errors.push(`JSON parse failed: ${parseError.message}`);
        }
      } else {
        analysisResult.warnings.push('Images data is object - may need restructuring');
      }

      // Overall assessment
      const validImages = analysisResult.processedImages.filter(img => img.isValid);
      const primaryImages = analysisResult.processedImages.filter(img => img.isPrimary);
      
      analysisResult.summary = {
        totalImages: analysisResult.processedImages.length,
        validImages: validImages.length,
        primaryImages: primaryImages.length,
        allValid: validImages.length === analysisResult.processedImages.length,
        hasPrimary: primaryImages.length > 0,
        recommendation: getRecommendation(analysisResult)
      };

      console.log('📊 Analysis complete:', analysisResult);
      setAnalysis(analysisResult);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setAnalysis({
        error: error.message,
        vehicleInfo: {
          id: vehicle.id,
          name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`
        }
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getRecommendation = (analysis) => {
    if (analysis.errors.length > 0) {
      return 'CRITICAL: Fix data structure errors';
    }
    
    if (analysis.summary.validImages === 0) {
      return 'URGENT: No valid images - needs repair';
    }
    
    if (analysis.summary.validImages < analysis.summary.totalImages) {
      return 'WARNING: Some images are broken - partial repair needed';
    }
    
    if (!analysis.summary.hasPrimary) {
      return 'MINOR: No primary image set - minor fix needed';
    }
    
    return 'OK: All images are working correctly';
  };

  const getStatusColor = (isValid) => {
    return isValid ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getSummaryColor = (recommendation) => {
    if (recommendation.startsWith('CRITICAL') || recommendation.startsWith('URGENT')) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (recommendation.startsWith('WARNING')) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    if (recommendation.startsWith('MINOR')) {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    }
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🔍 Image Debug Tool</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">⚡ Real-Time Debugging</h2>
          <p className="text-yellow-700 text-sm">
            This tool analyzes vehicle images in real-time to help identify why images might not be showing up. 
            Select a vehicle to see detailed analysis of its image data and URLs.
          </p>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Select Vehicle to Analyze</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading vehicles...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => analyzeVehicleImages(vehicle)}
                  disabled={analyzing}
                  className="text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <h3 className="font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Stock: {vehicle.stock_number || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Images: {Array.isArray(vehicle.images) ? vehicle.images.length : 'Unknown format'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analyzing && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Analyzing images...</p>
              <p className="text-sm text-gray-500 mt-2">Testing URLs and image loading...</p>
            </div>
          </div>
        )}

        {analysis && !analyzing && (
          <div className="space-y-6">
            {/* Summary */}
            <div className={`rounded-lg p-6 border ${getSummaryColor(analysis.summary?.recommendation || '')}`}>
              <h2 className="text-xl font-bold mb-4">
                📊 Analysis Summary: {analysis.vehicleInfo?.name}
              </h2>
              
              {analysis.error ? (
                <p className="font-semibold">Error: {analysis.error}</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Quick Stats</h3>
                    <div className="space-y-1 text-sm">
                      <p>Total Images: {analysis.summary?.totalImages || 0}</p>
                      <p>Valid Images: {analysis.summary?.validImages || 0}</p>
                      <p>Primary Images: {analysis.summary?.primaryImages || 0}</p>
                      <p>Data Type: {analysis.rawImagesType}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Recommendation</h3>
                    <p className="text-sm font-medium">
                      {analysis.summary?.recommendation || 'No recommendation available'}
                    </p>
                    {analysis.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-red-600">Errors:</p>
                        <ul className="text-xs list-disc list-inside">
                          {analysis.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Analysis */}
            {analysis.processedImages && analysis.processedImages.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">🔍 Detailed Image Analysis</h2>
                
                <div className="space-y-4">
                  {analysis.processedImages.map((img, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${getStatusColor(img.isValid)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold">
                          Image {index + 1} {img.isPrimary && '(Primary)'}
                        </h3>
                        <span className="text-sm font-bold">
                          {img.isValid ? '✅ VALID' : '❌ INVALID'}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium mb-1">Basic Info</h4>
                          <p>Type: {img.type}</p>
                          <p>URL: {img.url ? 'Present' : 'Missing'}</p>
                          {img.url && (
                            <p className="break-all text-xs bg-gray-100 p-1 rounded mt-1">
                              {img.url}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-1">Test Results</h4>
                          {img.fetchTest && (
                            <p>Fetch: {img.fetchTest.ok ? '✅' : '❌'} {img.fetchTest.status || img.fetchTest.error}</p>
                          )}
                          {img.loadTest && (
                            <p>Load: {img.loadTest.success ? '✅' : '❌'} {img.loadTest.error || `${img.loadTest.naturalWidth}x${img.loadTest.naturalHeight}`}</p>
                          )}
                        </div>
                      </div>
                      
                      {img.errors.length > 0 && (
                        <div className="mt-3 text-xs">
                          <p className="font-medium text-red-600">Errors:</p>
                          <ul className="list-disc list-inside">
                            {img.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Image Preview */}
                      {img.url && img.isValid && (
                        <div className="mt-3">
                          <h4 className="font-medium mb-1 text-xs">Preview:</h4>
                          <img
                            src={img.url}
                            alt={`Preview ${index + 1}`}
                            className="h-16 w-auto rounded border"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="hidden text-xs text-red-600">
                            Failed to load preview
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">📋 Raw Data</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Database Images Field</h3>
                  <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(analysis.rawImages, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">🛠️ How to Use This Tool</h2>
          <div className="text-sm space-y-2 text-gray-700">
            <p>1. <strong>Select a vehicle</strong> from the list above to analyze its images</p>
            <p>2. <strong>Review the summary</strong> to see overall status and recommendations</p>
            <p>3. <strong>Check detailed analysis</strong> to see exactly which images are broken and why</p>
            <p>4. <strong>Look at raw data</strong> to see exactly what's stored in the database</p>
            <p>5. <strong>Use the recommendations</strong> to fix any issues found</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <h4 className="font-semibold text-blue-800 mb-1">💡 Tip</h4>
            <p className="text-blue-700 text-sm">
              If images are showing as invalid, the URLs may be malformed or the bucket might not be publicly accessible. 
              Run the Storage Test first to verify your Supabase configuration.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}