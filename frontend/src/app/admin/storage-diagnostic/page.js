// frontend/src/app/admin/storage-diagnostic/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { 
  checkStorageConfig, 
  setupStorageBucket, 
  testImageUpload, 
  cleanupTestFiles,
  cleanSlateRepair,
  fixToyotaCamryNow,
  aggressiveRepairVehicle,
  getVehicles,
  supabase
} from "@/lib/supabase";

export default function StorageDiagnostic() {
  const [diagnostics, setDiagnostics] = useState({
    config: null,
    bucket: null,
    upload: null,
    cleanup: null
  });
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [repairResults, setRepairResults] = useState([]);

  useEffect(() => {
    runDiagnostics();
    fetchVehicles();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    
    try {
      // Check storage configuration
      const configResult = await checkStorageConfig();
      setDiagnostics(prev => ({ ...prev, config: configResult }));
      
      // Setup bucket if needed
      if (!configResult.success) {
        const bucketResult = await setupStorageBucket();
        setDiagnostics(prev => ({ ...prev, bucket: bucketResult }));
      }
      
    } catch (error) {
      console.error('Diagnostic error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await getVehicles();
      if (!error && data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleTestUpload = async () => {
    setLoading(true);
    try {
      const result = await testImageUpload();
      setDiagnostics(prev => ({ ...prev, upload: result }));
    } catch (error) {
      console.error('Test upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const result = await cleanupTestFiles();
      setDiagnostics(prev => ({ ...prev, cleanup: result }));
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairVehicle = async (vehicleId) => {
    setLoading(true);
    try {
      const result = await aggressiveRepairVehicle(vehicleId);
      setRepairResults(prev => [...prev, { vehicleId, result }]);
    } catch (error) {
      console.error('Repair error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanSlateRepair = async () => {
    setLoading(true);
    try {
      const result = await cleanSlateRepair();
      setRepairResults(prev => [...prev, { vehicleId: 'all', result }]);
    } catch (error) {
      console.error('Clean slate repair error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixToyotaCamry = async () => {
    setLoading(true);
    try {
      const result = await fixToyotaCamryNow();
      setRepairResults(prev => [...prev, { vehicleId: 'camry', result }]);
    } catch (error) {
      console.error('Toyota Camry fix error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Storage Diagnostics</h1>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            🔍 Check Config
          </button>
          
          <button
            onClick={handleTestUpload}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            🧪 Test Upload
          </button>
          
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            🧹 Clear Logs
          </button>

          <button
            onClick={handleCleanSlateRepair}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            🔧 Repair All
          </button>
        </div>

        {/* Diagnostic Results */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Storage Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🔧 Storage Configuration
              {diagnostics.config && (
                <span className={getStatusColor(diagnostics.config.success)}>
                  {getStatusIcon(diagnostics.config.success)}
                </span>
              )}
            </h2>
            
            {diagnostics.config ? (
              <div className="space-y-2 text-sm">
                <p className={`font-semibold ${getStatusColor(diagnostics.config.success)}`}>
                  {diagnostics.config.message}
                </p>
                
                {diagnostics.config.bucket && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p><strong>Bucket:</strong> {diagnostics.config.bucket.name}</p>
                    <p><strong>Files:</strong> {diagnostics.config.fileCount}</p>
                  </div>
                )}
                
                {diagnostics.config.error && (
                  <p className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    {diagnostics.config.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click "Check Config" to verify setup</p>
            )}
          </div>

          {/* Bucket Setup */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🪣 Bucket Setup
              {diagnostics.bucket && (
                <span className={getStatusColor(diagnostics.bucket.success)}>
                  {getStatusIcon(diagnostics.bucket.success)}
                </span>
              )}
            </h2>
            
            {diagnostics.bucket ? (
              <div className="space-y-2 text-sm">
                <p className={`font-semibold ${getStatusColor(diagnostics.bucket.success)}`}>
                  {diagnostics.bucket.message}
                </p>
                {diagnostics.bucket.error && (
                  <p className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    {diagnostics.bucket.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Bucket setup will run automatically if needed</p>
            )}
          </div>

          {/* Image Upload Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🖼️ Image Upload Test
              {diagnostics.upload && (
                <span className={getStatusColor(diagnostics.upload.success)}>
                  {getStatusIcon(diagnostics.upload.success)}
                </span>
              )}
            </h2>
            
            {diagnostics.upload ? (
              <div className="space-y-2 text-sm">
                <p className={`font-semibold ${getStatusColor(diagnostics.upload.success)}`}>
                  {diagnostics.upload.message}
                </p>
                
                {diagnostics.upload.url && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-600 mb-2">Generated URL:</p>
                    <a 
                      href={diagnostics.upload.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs break-all"
                    >
                      {diagnostics.upload.url}
                    </a>
                  </div>
                )}
                
                {diagnostics.upload.error && (
                  <p className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    {diagnostics.upload.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click "Test Upload" to upload a test image</p>
            )}
          </div>

          {/* Cleanup Test Files */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🧹 Cleanup Test Files
              {diagnostics.cleanup && (
                <span className={getStatusColor(diagnostics.cleanup.success)}>
                  {getStatusIcon(diagnostics.cleanup.success)}
                </span>
              )}
            </h2>
            
            {diagnostics.cleanup ? (
              <div className="space-y-2 text-sm">
                <p className={`font-semibold ${getStatusColor(diagnostics.cleanup.success)}`}>
                  {diagnostics.cleanup.message}
                </p>
                
                {diagnostics.cleanup.error && (
                  <p className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    {diagnostics.cleanup.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click "Clear Logs" to remove test files</p>
            )}
          </div>
        </div>

        {/* Vehicle Repair Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔧 Vehicle Image Repair</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleFixToyotaCamry}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  🚗 Fix Toyota Camry
                </button>
                
                <button
                  onClick={handleCleanSlateRepair}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  🧹 Repair All Vehicles
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Repair Single Vehicle</h3>
              <div className="flex gap-2">
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => handleRepairVehicle(selectedVehicle)}
                  disabled={loading || !selectedVehicle}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Repair
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Repair Results */}
        {repairResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🔧 Repair Results</h2>
            <div className="space-y-3">
              {repairResults.map((result, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      Vehicle ID: {result.vehicleId}
                    </span>
                    <span className={getStatusColor(result.result.success)}>
                      {getStatusIcon(result.result.success)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.result.message || result.result.error}
                  </p>
                  {result.result.newImageUrl && (
                    <a 
                      href={result.result.newImageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View New Image
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}