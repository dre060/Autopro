// frontend/src/app/admin/storage-test/page.js - SIMPLE STORAGE URL TEST
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function SimpleStorageTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runStorageUrlTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results = [];
    
    try {
      // Test 1: Check environment variables
      results.push({
        test: "Environment Variables",
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ URL present" : "❌ URL missing",
        details: process.env.NEXT_PUBLIC_SUPABASE_URL ? `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}` : "NEXT_PUBLIC_SUPABASE_URL not found"
      });
      
      results.push({
        test: "Supabase Key",
        status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Key present" : "❌ Key missing",
        details: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Anon key is configured" : "NEXT_PUBLIC_SUPABASE_ANON_KEY not found"
      });

      // Test 2: Check if bucket exists
      try {
        const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          results.push({
            test: "Bucket List",
            status: "❌ Error",
            details: `Error listing buckets: ${bucketError.message}`
          });
        } else {
          const vehicleImagesBucket = bucketList.find(b => b.name === 'vehicle-images');
          results.push({
            test: "Bucket Exists",
            status: vehicleImagesBucket ? "✅ Found" : "❌ Missing",
            details: vehicleImagesBucket ? 
              `Bucket found. Public: ${vehicleImagesBucket.public}, Created: ${vehicleImagesBucket.created_at}` :
              "vehicle-images bucket not found"
          });
        }
      } catch (bucketErr) {
        results.push({
          test: "Bucket List",
          status: "❌ Error",
          details: `Exception: ${bucketErr.message}`
        });
      }

      // Test 3: List files in bucket
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('vehicle-images')
          .list('', { limit: 10 });
        
        if (listError) {
          results.push({
            test: "File List",
            status: "❌ Error",
            details: `Error listing files: ${listError.message}`
          });
        } else {
          results.push({
            test: "File List",
            status: "✅ Success",
            details: `Found ${files.length} files in bucket`
          });
          
          // Test URLs for first few files
          if (files.length > 0) {
            for (let i = 0; i < Math.min(3, files.length); i++) {
              const file = files[i];
              
              // Generate public URL
              const { data: { publicUrl } } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(file.name);
              
              // Test if URL is accessible
              try {
                const response = await fetch(publicUrl, { method: 'HEAD' });
                results.push({
                  test: `URL Test ${i + 1}`,
                  status: response.ok ? `✅ ${response.status}` : `❌ ${response.status}`,
                  details: `File: ${file.name}, URL: ${publicUrl}, Status: ${response.status} ${response.statusText}`
                });
              } catch (fetchErr) {
                results.push({
                  test: `URL Test ${i + 1}`,
                  status: "❌ Fetch Error",
                  details: `File: ${file.name}, URL: ${publicUrl}, Error: ${fetchErr.message}`
                });
              }
            }
          }
        }
      } catch (listErr) {
        results.push({
          test: "File List",
          status: "❌ Error",
          details: `Exception: ${listErr.message}`
        });
      }

      // Test 4: Try uploading a simple test file
      try {
        const testFile = new Blob(['test content'], { type: 'text/plain' });
        const fileName = `storage-test-${Date.now()}.txt`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, testFile);
        
        if (uploadError) {
          results.push({
            test: "Test Upload",
            status: "❌ Error",
            details: `Upload failed: ${uploadError.message}`
          });
        } else {
          results.push({
            test: "Test Upload",
            status: "✅ Success",
            details: `Successfully uploaded: ${uploadData.path}`
          });
          
          // Test the uploaded file's URL
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);
          
          try {
            const response = await fetch(publicUrl);
            const content = await response.text();
            
            results.push({
              test: "Test Upload URL",
              status: response.ok ? "✅ Accessible" : `❌ ${response.status}`,
              details: `URL: ${publicUrl}, Content: "${content}"`
            });
          } catch (fetchErr) {
            results.push({
              test: "Test Upload URL",
              status: "❌ Not Accessible",
              details: `URL: ${publicUrl}, Error: ${fetchErr.message}`
            });
          }
          
          // Clean up test file
          await supabase.storage
            .from('vehicle-images')
            .remove([fileName]);
        }
      } catch (uploadErr) {
        results.push({
          test: "Test Upload",
          status: "❌ Error",
          details: `Exception: ${uploadErr.message}`
        });
      }

      // Test 5: Check bucket policy/RLS
      try {
        const { data: policies, error: policyError } = await supabase
          .from('buckets')
          .select('*')
          .eq('name', 'vehicle-images');
        
        if (policyError) {
          results.push({
            test: "Bucket Policy",
            status: "⚠️ Cannot Check",
            details: `Cannot read bucket policies: ${policyError.message}`
          });
        } else {
          results.push({
            test: "Bucket Policy",
            status: "ℹ️ Info",
            details: `Bucket configuration: ${JSON.stringify(policies, null, 2)}`
          });
        }
      } catch (policyErr) {
        results.push({
          test: "Bucket Policy",
          status: "⚠️ Cannot Check",
          details: `Exception: ${policyErr.message}`
        });
      }

    } catch (error) {
      results.push({
        test: "General Error",
        status: "❌ Failed",
        details: `Unexpected error: ${error.message}`
      });
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    if (status.includes('✅')) return 'text-green-600';
    if (status.includes('❌')) return 'text-red-600';
    if (status.includes('⚠️')) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🧪 Simple Storage URL Test</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">ℹ️ What This Tests</h2>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Environment variables configuration</li>
            <li>• Supabase storage bucket existence and accessibility</li>
            <li>• File listing and public URL generation</li>
            <li>• Actual URL accessibility (can images be fetched?)</li>
            <li>• Upload functionality with real URL testing</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Run Storage Tests</h2>
            <button
              onClick={runStorageUrlTest}
              disabled={loading}
              className={`px-6 py-2 rounded font-semibold text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '🔄 Testing...' : '🧪 Run All Tests'}
            </button>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{result.test}</h4>
                    <span className={`font-semibold ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded break-all">
                    {result.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">🔧 Next Steps Based on Results</h2>
          <div className="text-sm space-y-2 text-gray-700">
            <p><strong>If Environment Variables fail:</strong> Check your .env.local file</p>
            <p><strong>If Bucket doesn't exist:</strong> Go to Supabase dashboard → Storage → Create bucket named "vehicle-images"</p>
            <p><strong>If Bucket exists but files aren't accessible:</strong> Check bucket is set to "Public" in Supabase dashboard</p>
            <p><strong>If URLs return 404:</strong> Bucket exists but RLS policies may be blocking access</p>
            <p><strong>If Upload fails:</strong> Check Supabase project quotas and permissions</p>
            <p><strong>If all tests pass:</strong> The issue is likely in the vehicle image processing logic</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}