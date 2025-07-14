// Create this file: frontend/src/app/admin/test-images/page.js
// Use this to test image uploads independently

"use client";

import { useState } from "react";
import { supabase, uploadVehicleImages, ensureStorageBucket } from "@/lib/supabase";

export default function ImageTestPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bucketInfo, setBucketInfo] = useState(null);

  const checkBucketStatus = async () => {
    try {
      console.log("Checking bucket status...");
      
      // List all buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log("All buckets:", buckets);
      
      if (bucketsError) {
        console.error("Error listing buckets:", bucketsError);
        setError(`Error listing buckets: ${bucketsError.message}`);
        return;
      }
      
      const vehicleBucket = buckets?.find(b => b.name === 'vehicle-images');
      console.log("Vehicle images bucket:", vehicleBucket);
      
      if (!vehicleBucket) {
        setError("vehicle-images bucket not found");
        return;
      }
      
      // Try to list files in bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('vehicle-images')
        .list('', { limit: 10 });
      
      console.log("Files in bucket:", files);
      
      if (filesError) {
        console.error("Error listing files:", filesError);
        setError(`Error accessing bucket: ${filesError.message}`);
        return;
      }
      
      setBucketInfo({
        bucket: vehicleBucket,
        fileCount: files?.length || 0,
        files: files || []
      });
      
      setError("");
    } catch (err) {
      console.error("Bucket check error:", err);
      setError(`Bucket check failed: ${err.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    console.log("Selected files:", files);
  };

  const testUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select files first");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      console.log("Starting upload test...");
      
      // Ensure bucket exists
      await ensureStorageBucket();
      
      // Upload images
      const result = await uploadVehicleImages(selectedFiles);
      
      if (result.error) {
        throw result.error;
      }
      
      console.log("Upload successful:", result.data);
      setUploadedImages(result.data);
      setSelectedFiles([]);
      
      // Re-check bucket status
      await checkBucketStatus();
      
    } catch (err) {
      console.error("Upload error:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select files first");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const file = selectedFiles[0];
      const fileName = `test-${Date.now()}.${file.name.split('.').pop()}`;
      
      console.log("Testing direct upload:", fileName);
      
      // Direct Supabase upload
      const { data, error } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      console.log("Direct upload data:", data);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);
      
      console.log("Public URL data:", urlData);
      
      setUploadedImages([{
        url: urlData.publicUrl,
        alt: "Test image",
        fileName: fileName
      }]);
      
    } catch (err) {
      console.error("Direct upload error:", err);
      setError(`Direct upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestImages = async () => {
    try {
      const filenames = uploadedImages.map(img => img.fileName).filter(Boolean);
      
      if (filenames.length > 0) {
        const { error } = await supabase.storage
          .from('vehicle-images')
          .remove(filenames);
        
        if (error) {
          throw error;
        }
        
        setUploadedImages([]);
        await checkBucketStatus();
        console.log("Deleted test images");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Image Upload Test</h1>
        
        {/* Bucket Status */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Bucket Status</h2>
            <button
              onClick={checkBucketStatus}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Check Status
            </button>
          </div>
          
          {bucketInfo ? (
            <div className="space-y-2 text-sm">
              <p><strong>Bucket:</strong> {bucketInfo.bucket.name}</p>
              <p><strong>Public:</strong> {bucketInfo.bucket.public ? "Yes" : "No"}</p>
              <p><strong>Files in bucket:</strong> {bucketInfo.fileCount}</p>
              {bucketInfo.files.length > 0 && (
                <details>
                  <summary>Recent files:</summary>
                  <ul className="mt-2 space-y-1">
                    {bucketInfo.files.slice(0, 5).map(file => (
                      <li key={file.name} className="text-xs text-gray-600">
                        {file.name} ({new Date(file.created_at).toLocaleString()})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Click "Check Status" to verify bucket setup</p>
          )}
        </div>

        {/* File Selection */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Select Test Images</h2>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded"
          />
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold">Selected files:</p>
              <ul className="text-sm text-gray-600">
                {selectedFiles.map((file, index) => (
                  <li key={index}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Upload Tests</h2>
          <div className="flex gap-4">
            <button
              onClick={testUpload}
              disabled={loading || selectedFiles.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? "Uploading..." : "Test Helper Function"}
            </button>
            
            <button
              onClick={testDirectUpload}
              disabled={loading || selectedFiles.length === 0}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? "Uploading..." : "Test Direct Upload"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Uploaded Images</h2>
              <button
                onClick={deleteTestImages}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Test Images
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {uploadedImages.map((image, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded mb-2"
                    onError={(e) => {
                      console.error("Image load error:", e);
                      e.target.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log("Image loaded successfully:", image.url);
                    }}
                  />
                  <p className="text-xs text-gray-600 break-all">{image.fileName}</p>
                  <a 
                    href={image.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Log */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg mt-6">
          <p className="text-sm">Check the browser console for detailed logs</p>
        </div>
      </div>
    </div>
  );
}