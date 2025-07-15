// frontend/src/app/admin/storage-diagnostic/page.js - COMPLETE FIX
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { 
  supabase, 
  cleanupCorruptedImages,
  checkStorageConfig,
  setupStorageBucket,
  testImageUpload,
  cleanupTestFiles,
  completeVehicleImageRepair
} from "@/lib/supabase";

export default function StorageDiagnostic() {
  const [bucketFiles, setBucketFiles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fixResults, setFixResults] = useState([]);
  const [fixing, setFixing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState({});

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
    
    const consoleLog = `[${timestamp}] ${message}`;
    switch(type) {
      case 'error':
        console.error(consoleLog);
        break;
      case 'success':
        console.log(`✅ ${consoleLog}`);
        break;
      case 'warning':
        console.warn(`⚠️ ${consoleLog}`);
        break;
      default:
        console.log(consoleLog);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setLoading(true);
    addLog('Loading diagnostic data...', 'info');
    
    try {
      // Get all files from storage bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 1000 });
      
      if (filesError) {
        setError(`Failed to list bucket files: ${filesError.message}`);
        addLog(`Failed to list bucket files: ${filesError.message}`, 'error');
      } else {
        setBucketFiles(files || []);
        addLog(`Found ${files?.length || 0} files in storage bucket`, 'info');
      }

      // Get all vehicles from database
      const { data: vehicleData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (vehiclesError) {
        setError(`Failed to load vehicles: ${vehiclesError.message}`);
        addLog(`Failed to load vehicles: ${vehiclesError.message}`, 'error');
      } else {
        setVehicles(vehicleData || []);
        addLog(`Loaded ${vehicleData?.length || 0} vehicles from database`, 'info');
      }
    } catch (err) {
      setError(`Diagnostic error: ${err.message}`);
      addLog(`Diagnostic error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced image health analysis with actual existence testing
  const analyzeImageHealth = async (vehicle) => {
    if (!vehicle.images || !Array.isArray(vehicle.images) || vehicle.images.length === 0) {
      return { status: 'no-images', message: 'No images found' };
    }
    
    let brokenCount = 0;
    let validCount = 0;
    let existingCount = 0;
    
    for (const img of vehicle.images) {
      const url = typeof img === 'string' ? img : (img?.url || img?.publicUrl);
      
      if (!url || url === '') {
        brokenCount++;
      } else if (url.length > 500) {
        brokenCount++; // Extremely long URLs are likely corrupted
      } else if (!url.includes('.jpg') && !url.includes('.jpeg') && !url.includes('.png') && !url.includes('.webp')) {
        brokenCount++; // No valid image extension
      } else {
        // Test if image actually exists
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            validCount++;
            existingCount++;
          } else {
            validCount++; // URL format is valid
            // but image doesn't exist
          }
        } catch (error) {
          validCount++; // URL format is valid but image doesn't exist
        }
      }
    }
    
    if (brokenCount > 0) {
      return { 
        status: 'broken', 
        message: `${brokenCount} broken image(s), ${validCount} valid URLs`,
        brokenCount,
        validCount,
        existingCount
      };
    }
    
    if (existingCount === 0) {
      return {
        status: 'missing',
        message: `${validCount} valid URLs but images don't exist`,
        validCount,
        existingCount
      };
    }
    
    return { 
      status: 'healthy', 
      message: `${existingCount} accessible image(s)`,
      existingCount
    };
  };

  // FIXED: Enhanced repair function with better error handling
  const quickRepairVehicle = async (vehicle) => {
    setFixing(true);
    addLog(`Starting repair for ${vehicle.year} ${vehicle.make} ${vehicle.model}...`, 'info');
    
    try {
      const result = await completeVehicleImageRepair(vehicle.id);
      
      if (result.success) {
        addLog(`✅ Successfully repaired: ${result.message}`, 'success');
        
        // Reload data to show changes
        await loadDiagnosticData();
        
        // Show success message
        alert(`✅ ${result.message}\n\nNew Image URL: ${result.newImageUrl}`);
      } else {
        addLog(`❌ Repair failed: ${result.error}`, 'error');
        alert(`❌ Repair failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Repair error: ${error.message}`, 'error');
      alert(`❌ Repair error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // FIXED: Enhanced bulk repair
  const repairAllCorruptedImages = async () => {
    setFixing(true);
    setFixResults([]);
    addLog('Starting bulk repair of all corrupted images...', 'info');
    
    try {
      const result = await cleanupCorruptedImages();
      
      if (result.success) {
        addLog(`✅ Bulk repair completed: ${result.message}`, 'success');
        setFixResults(result.repairedVehicles || []);
        
        // Reload data
        await loadDiagnosticData();
        
        alert(`✅ ${result.message}`);
      } else {
        addLog(`❌ Bulk repair failed: ${result.error}`, 'error');
        alert(`❌ Bulk repair failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Bulk repair error: ${error.message}`, 'error');
      alert(`❌ Bulk repair error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // FIXED: Emergency Toyota Camry repair
  const emergencyRepairCamry = async () => {
    setFixing(true);
    addLog('🚨 EMERGENCY: Starting Toyota Camry repair...', 'warning');
    
    try {
      const camryId = '411138ea-874b-42f5-a234-7c8df83d3af3';
      const result = await completeVehicleImageRepair(camryId);
      
      if (result.success) {
        addLog(`✅ EMERGENCY SUCCESS: ${result.message}`, 'success');
        addLog(`🔗 New image URL: ${result.newImageUrl}`, 'info');
        
        // Reload data
        await loadDiagnosticData();
        
        alert(`🎉 EMERGENCY REPAIR SUCCESSFUL!\n\n${result.message}\n\nNew Image URL: ${result.newImageUrl}`);
      } else {
        addLog(`❌ Emergency repair failed: ${result.error}`, 'error');
        alert(`❌ Emergency repair failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Emergency repair error: ${error.message}`, 'error');
      alert(`❌ Emergency repair error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  // Test function runner
  const runTest = async (testName, testFunction) => {
    const loadingState = { ...loading };
    loadingState[testName] = true;
    setLoading(loadingState);
    
    addLog(`🚀 Starting ${testName}...`, 'info');
    
    try {
      const result = await testFunction();
      setResults(prev => ({ ...prev, [testName]: result }));
      
      if (result && result.success) {
        addLog(`✅ ${testName} completed successfully: ${result.message || 'OK'}`, 'success');
      } else {
        const errorMsg = result?.error || 'Unknown error occurred';
        addLog(`❌ ${testName} failed: ${errorMsg}`, 'error');
      }
      
      return result;
    } catch (error) {
      const errorMsg = error?.message || error || 'Unexpected error';
      addLog(`💥 ${testName} threw error: ${errorMsg}`, 'error');
      setResults(prev => ({ ...prev, [testName]: { success: false, error: errorMsg } }));
      return { success: false, error: errorMsg };
    } finally {
      const loadingState = { ...loading };
      loadingState[testName] = false;
      setLoading(loadingState);
    }
  };

  // Test functions
  const testStorageConfig = () => runTest('Storage Config', checkStorageConfig);
  const testBucketSetup = () => runTest('Bucket Setup', setupStorageBucket);
  const testImageUploadFunc = () => runTest('Image Upload', testImageUpload);
  const testCleanup = () => runTest('Cleanup Test Files', cleanupTestFiles);

  // Calculate statistics
  const totalVehicles = vehicles.length;
  const vehiclesWithImages = vehicles.filter(v => v.images && Array.isArray(v.images) && v.images.length > 0).length;

  // Component for displaying test results
  const ResultCard = ({ title, result, isLoading, testKey }) => (
    <div className={`p-6 rounded-lg border transition-all duration-300 ${
      !result ? 'bg-gray-50 border-gray-200' :
      result.success ? 'bg-green-50 border-green-200 shadow-md' :
      'bg-red-50 border-red-200 shadow-md'
    }`}>
      <h3 className="font-bold mb-3 flex items-center gap-2 text-lg">
        {title}
        {isLoading && (
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        )}
      </h3>
      
      {!result ? (
        <p className="text-gray-500">Not tested yet</p>
      ) : result.success ? (
        <div className="space-y-2">
          <p className="text-green-700 font-medium flex items-center gap-2">
            <span className="text-green-500">✅</span> Success
          </p>
          {result.message && (
            <p className="text-sm text-gray-600 bg-white p-2 rounded border">{result.message}</p>
          )}
          {result.url && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Generated URL:</p>
              <div className="bg-white p-2 rounded border">
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 break-all hover:underline"
                >
                  {result.url}
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span className="text-red-500">❌</span> Failed
          </p>
          <p className="text-sm text-red-600 mt-2 bg-white p-2 rounded border">
            {result.error || 'Unknown error occurred'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Enhanced Storage Diagnostic & Repair Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive diagnostic and repair tools for vehicle image storage issues.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Storage Files</h3>
            <p className="text-3xl font-bold text-blue-600">{bucketFiles.length}</p>
            <p className="text-sm text-gray-500">Files in bucket</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Total Vehicles</h3>
            <p className="text-3xl font-bold text-green-600">{totalVehicles}</p>
            <p className="text-sm text-gray-500">In database</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">With Images</h3>
            <p className="text-3xl font-bold text-yellow-600">{vehiclesWithImages}</p>
            <p className="text-sm text-gray-500">Have image URLs</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Need Repair</h3>
            <p className="text-3xl font-bold text-red-600">
              {vehicles.filter(v => !v.images || !Array.isArray(v.images) || v.images.length === 0).length}
            </p>
            <p className="text-sm text-gray-500">Broken or missing</p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-600">🎮</span> Emergency Repair & Test Controls
          </h2>
          
          {/* EMERGENCY REPAIR BUTTONS */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-red-800 font-bold mb-2">🚨 EMERGENCY REPAIRS</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={emergencyRepairCamry}
                disabled={fixing}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm font-semibold"
              >
                🚗 FIX TOYOTA CAMRY NOW
              </button>
              
              <button
                onClick={repairAllCorruptedImages}
                disabled={fixing}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm font-semibold"
              >
                🔧 REPAIR ALL BROKEN
              </button>
              
              <button
                onClick={loadDiagnosticData}
                disabled={fixing}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm"
              >
                🔄 REFRESH DATA
              </button>
            </div>
          </div>
          
          {/* DIAGNOSTIC BUTTONS */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-bold mb-2">🔍 Diagnostics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={testStorageConfig}
                disabled={fixing}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm"
              >
                🔍 Check Config
              </button>
              
              <button
                onClick={testBucketSetup}
                disabled={fixing}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm"
              >
                🛠️ Setup Bucket
              </button>
              
              <button
                onClick={testImageUploadFunc}
                disabled={fixing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-sm"
              >
                📤 Test Upload
              </button>
              
              <button
                onClick={clearLogs}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>
          
          {fixing && (
            <div className="mt-4 flex items-center gap-2 text-red-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
              <span className="font-semibold">REPAIR IN PROGRESS...</span>
            </div>
          )}
        </div>

        {/* Test Results Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ResultCard 
            title="🔍 Storage Configuration" 
            result={results['Storage Config']} 
            isLoading={loading['Storage Config']}
            testKey="Storage Config"
          />
          <ResultCard 
            title="🛠️ Bucket Setup" 
            result={results['Bucket Setup']} 
            isLoading={loading['Bucket Setup']}
            testKey="Bucket Setup"
          />
          <ResultCard 
            title="📤 Image Upload Test" 
            result={results['Image Upload']} 
            isLoading={loading['Image Upload']}
            testKey="Image Upload"
          />
          <ResultCard 
            title="🧹 Cleanup Test Files" 
            result={results['Cleanup Test Files']} 
            isLoading={loading['Cleanup Test Files']}
            testKey="Cleanup Test Files"
          />
        </div>

        {/* Repair Results */}
        {fixResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">🔧 Repair Results</h2>
            <div className="space-y-2">
              {fixResults.map((result, index) => (
                <div key={index} className={`border-l-4 pl-4 py-2 ${
                  result.status === 'repaired' ? 'border-green-500' : 'border-red-500'
                }`}>
                  <p className="font-semibold">{result.name}</p>
                  <p className={`text-sm ${
                    result.status === 'repaired' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.status === 'repaired' ? '✅ Successfully repaired' : `❌ Failed: ${result.error}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Logs */}
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <span className="text-green-400">💻</span> Debug Logs
            </h2>
            <button
              onClick={clearLogs}
              className="text-gray-400 hover:text-white text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No logs yet... Run a test to see debug information.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className={`text-sm ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500 text-xs">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Details Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Vehicle Image Health Analysis</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading vehicles...</p>
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
                      Image Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Health Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => {
                    const imageCount = vehicle.images ? vehicle.images.length : 0;
                    const hasImages = imageCount > 0;
                    
                    return (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {vehicle.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              Stock: {vehicle.stock_number || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {imageCount} image(s)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasImages ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              ⚠️ Needs Check
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              ❌ No Images
                            </span>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {hasImages ? 'URLs exist but images may be missing' : 'No image URLs found'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedVehicle(vehicle)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => quickRepairVehicle(vehicle)}
                              disabled={fixing}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Repair
                            </button>
                          </div>
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
                  <h4 className="font-semibold mb-2">Database Record (Images):</h4>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedVehicle.images, null, 2)}
                  </pre>
                </div>
                
                {selectedVehicle.images && selectedVehicle.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Image Analysis:</h4>
                    <div className="space-y-2">
                      {selectedVehicle.images.map((img, i) => {
                        const url = typeof img === 'string' ? img : (img?.url || img?.publicUrl);
                        const hasValidFormat = url && url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png');
                        
                        return (
                          <div key={i} className="border rounded p-3">
                            <p className="text-sm font-medium">Image {i + 1}:</p>
                            <p className="text-xs text-gray-600 break-all">
                              URL: {url || 'No URL provided'}
                            </p>
                            <p className={`text-sm mt-1 ${hasValidFormat ? 'text-yellow-600' : 'text-red-600'}`}>
                              Status: {hasValidFormat ? 'Valid URL Format (but file may not exist)' : 'Invalid URL Format'}
                            </p>
                            {url && hasValidFormat && (
                              <div className="mt-2">
                                <img 
                                  src={url} 
                                  alt="Vehicle" 
                                  className="w-32 h-24 object-cover border rounded"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <p className="text-xs text-red-600 mt-1" style={{display: 'none'}}>
                                  ❌ Image file does not exist at this URL
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
                      quickRepairVehicle(selectedVehicle);
                      setSelectedVehicle(null);
                    }}
                    disabled={fixing}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    🔧 Repair This Vehicle
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