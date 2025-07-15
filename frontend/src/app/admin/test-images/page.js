// frontend/src/app/admin/test-image/page.js - IMAGE UPLOAD TEST
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { uploadVehicleImages, checkStorageConfig } from "@/lib/supabase";

export default function TestImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [storageStatus, setStorageStatus] = useState(null);

  const checkStorage = async () => {
    const result = await checkStorageConfig();
    setStorageStatus(result);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setResults([]);
  };

  const testUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select some files first');
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      console.log('🧪 Starting test upload...');
      
      const uploadResult = await uploadVehicleImages(selectedFiles);
      
      console.log('Upload result:', uploadResult);
      
      if (uploadResult.data && uploadResult.data.length > 0) {
        setResults(uploadResult.data);
        console.log('✅ Upload successful!', uploadResult.data);
      } else {
        console.error('❌ Upload failed:', uploadResult.error);
        alert(`Upload failed: ${uploadResult.error?.message || 'Unknown error'}`);
      }
      
      if (uploadResult.error && uploadResult.error.partial) {
        console.warn('⚠️ Partial upload errors:', uploadResult.error.errors);
      }
      
    } catch (error) {
      console.error('❌ Test upload error:', error);
      alert(`Test failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setSelectedFiles([]);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🧪 Image Upload Test</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Test Purpose</h2>
          <p className="text-yellow-700 text-sm">
            This page tests the image upload functionality to help debug any issues with vehicle image uploads.
            Use this to verify that images are being uploaded and URLs are generated correctly.
          </p>
        </div>

        {/* Storage Status Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔍 Storage Status</h2>
          <button
            onClick={checkStorage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
          >
            Check Storage Configuration
          </button>
          
          {storageStatus && (
            <div className={`p-4 rounded ${storageStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-semibold ${storageStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                {storageStatus.success ? '✅ Storage OK' : '❌ Storage Error'}
              </p>
              <p className={`text-sm ${storageStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                {storageStatus.message || storageStatus.error}
              </p>
            </div>
          )}
        </div>

        {/* File Upload Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📤 Upload Test</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Images to Test</label>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Selected Files:</h3>
                <ul className="text-sm space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{file.name}</span>
                      <span className="text-gray-500">{Math.round(file.size / 1024)}KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={testUpload}
                disabled={uploading || selectedFiles.length === 0}
                className={`px-6 py-2 rounded font-semibold ${
                  uploading || selectedFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {uploading ? '🔄 Uploading...' : '📤 Test Upload'}
              </button>
              
              <button
                onClick={clearResults}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">✅ Upload Results</h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2">Image {index + 1}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1"><strong>URL:</strong></p>
                      <p className="text-xs break-all bg-gray-100 p-2 rounded">{result.url}</p>
                      
                      <p className="text-sm text-gray-600 mb-1 mt-2"><strong>Alt Text:</strong></p>
                      <p className="text-sm">{result.alt}</p>
                      
                      <p className="text-sm text-gray-600 mb-1 mt-2"><strong>Primary:</strong></p>
                      <p className="text-sm">{result.isPrimary ? 'Yes' : 'No'}</p>
                      
                      {result.fileName && (
                        <>
                          <p className="text-sm text-gray-600 mb-1 mt-2"><strong>File Name:</strong></p>
                          <p className="text-xs text-gray-500">{result.fileName}</p>
                        </>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 mb-2"><strong>Preview:</strong></p>
                      <div className="relative h-32 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={result.url}
                          alt={result.alt}
                          className="w-full h-full object-cover"
                          onLoad={() => console.log(`✅ Image ${index + 1} loaded successfully`)}
                          onError={(e) => {
                            console.error(`❌ Image ${index + 1} failed to load:`, result.url);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="absolute inset-0 bg-red-100 border-2 border-red-300 rounded hidden items-center justify-center"
                        >
                          <span className="text-red-600 text-sm">❌ Failed to Load</span>
                        </div>
                      </div>
                      
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm underline mt-2 inline-block"
                      >
                        🔗 Open in New Tab
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800 mb-2">🎉 Test Summary</h3>
              <p className="text-green-700 text-sm">
                Successfully uploaded {results.length} image{results.length !== 1 ? 's' : ''}. 
                If you can see the preview images above, the upload system is working correctly!
              </p>
            </div>
          </div>
        )}

        {/* Debug Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-bold mb-4">🔧 Debug Instructions</h2>
          <div className="text-sm space-y-2 text-gray-700">
            <p><strong>1. Check Storage:</strong> Click "Check Storage Configuration" to verify Supabase setup</p>
            <p><strong>2. Test Upload:</strong> Select some images and click "Test Upload" to see if upload works</p>
            <p><strong>3. Verify URLs:</strong> Check if the generated URLs work by clicking "Open in New Tab"</p>
            <p><strong>4. Check Console:</strong> Open browser dev tools and check console for detailed logs</p>
            <p><strong>5. If Failed:</strong> Check your Supabase project settings and environment variables</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}