// frontend/src/app/admin/storage-test/page.js - ENHANCED DEBUGGING
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { supabase, checkStorageConfig, testImageUpload, cleanupTestFiles } from "@/lib/supabase";

export default function EnhancedStorageTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runComprehensiveTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results = [];
    
    try {
      // Test 1: Environment Variables
      results.push({
        test: "Environment Variables",
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ PASS" : "❌ FAIL",
        details: `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'MISSING'}\nKey: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'MISSING'}`,
        data: process.env.NEXT_PUBLIC_SUPABASE_URL ? {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
        } : null
      });

      // Test 2: Storage Configuration Check
      console.log('🔍 Running storage config check...');
      const configResult = await checkStorageConfig();
      results.push({
        test: "Storage Configuration",
        status: configResult.success ? "✅ PASS" : "❌ FAIL",
        details: configResult.success ? 
          `Bucket accessible\nFiles found: ${configResult.fileCount}\nURL tests: ${configResult.urlTests?.length || 0}` :
          `Error: ${configResult.error}`,
        data: configResult
      });

      // Test 3: Direct Bucket Access
      console.log('🪣 Testing direct bucket access...');
      try {
        const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          results.push({
            test: "Bucket List",
            status: "❌ FAIL",
            details: `Error: ${bucketError.message}`,
            data: { error: bucketError }
          });
        } else {
          const vehicleImagesBucket = bucketList.find(b => b.name === 'vehicle-images');
          results.push({
            test: "Bucket List",
            status: vehicleImagesBucket ? "✅ PASS" : "⚠️ PARTIAL",
            details: vehicleImagesBucket ? 
              `Found vehicle-images bucket\nPublic: ${vehicleImagesBucket.public}\nCreated: ${vehicleImagesBucket.created_at}` :
              `Found ${bucketList.length} buckets but no vehicle-images`,
            data: { buckets: bucketList, target: vehicleImagesBucket }
          });
        }
      } catch (bucketErr) {
        results.push({
          test: "Bucket List",
          status: "❌ FAIL",
          details: `Exception: ${bucketErr.message}`,
          data: { error: bucketErr }
        });
      }

      // Test 4: File Upload Test
      console.log('📤 Testing image upload...');
      const uploadResult = await testImageUpload();
      results.push({
        test: "Image Upload",
        status: uploadResult.success ? "✅ PASS" : "❌ FAIL",
        details: uploadResult.success ? 
          `Upload successful\nURL: ${uploadResult.url}\nAccessible: ${uploadResult.urlAccessible ? 'Yes' : 'No'}` :
          `Error: ${uploadResult.error}`,
        data: uploadResult
      });

      // Test 5: URL Structure Analysis
      if (uploadResult.success && uploadResult.url) {
        console.log('🔗 Analyzing URL structure...');
        const url = uploadResult.url;
        const urlParts = new URL(url);
        
        results.push({
          test: "URL Structure",
          status: "ℹ️ INFO",
          details: `Protocol: ${urlParts.protocol}\nHost: ${urlParts.hostname}\nPath: ${urlParts.pathname}`,
          data: {
            protocol: urlParts.protocol,
            hostname: urlParts.hostname,
            pathname: urlParts.pathname,
            fullUrl: url
          }
        });

        // Test 6: URL Accessibility from Multiple Methods
        console.log('📡 Testing URL accessibility...');
        const accessTests = [];
        
        // HEAD request
        try {
          const headResponse = await fetch(url, { method: 'HEAD' });
          accessTests.push({
            method: 'HEAD',
            status: headResponse.status,
            statusText: headResponse.statusText,
            success: headResponse.ok
          });
        } catch (headError) {
          accessTests.push({
            method: 'HEAD',
            status: 'ERROR',
            statusText: headError.message,
            success: false
          });
        }

        // GET request
        try {
          const getResponse = await fetch(url, { method: 'GET' });
          accessTests.push({
            method: 'GET',
            status: getResponse.status,
            statusText: getResponse.statusText,
            success: getResponse.ok,
            contentType: getResponse.headers.get('content-type'),
            contentLength: getResponse.headers.get('content-length')
          });
        } catch (getError) {
          accessTests.push({
            method: 'GET',
            status: 'ERROR',
            statusText: getError.message,
            success: false
          });
        }

        const successfulTests = accessTests.filter(t => t.success).length;
        results.push({
          test: "URL Accessibility",
          status: successfulTests > 0 ? "✅ PASS" : "❌ FAIL",
          details: `${successfulTests}/${accessTests.length} access methods succeeded`,
          data: { accessTests }
        });
      }

      // Test 7: Browser Image Loading Test
      if (uploadResult.success && uploadResult.url) {
        console.log('🖼️ Testing browser image loading...');
        
        const imageLoadTest = await new Promise((resolve) => {
          const img = new Image();
          const timeout = setTimeout(() => {
            resolve({
              success: false,
              error: 'Timeout after 10 seconds',
              naturalWidth: 0,
              naturalHeight: 0
            });
          }, 10000);

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
              error: 'Image failed to load',
              naturalWidth: 0,
              naturalHeight: 0
            });
          };

          img.src = uploadResult.url;
        });

        results.push({
          test: "Browser Image Loading",
          status: imageLoadTest.success ? "✅ PASS" : "❌ FAIL",
          details: imageLoadTest.success ?
            `Image loaded successfully\nDimensions: ${imageLoadTest.naturalWidth}x${imageLoadTest.naturalHeight}` :
            `Error: ${imageLoadTest.error}`,
          data: imageLoadTest
        });
      }

      // Test 8: CORS Headers Check
      if (uploadResult.success && uploadResult.url) {
        console.log('🌐 Checking CORS headers...');
        
        try {
          const corsResponse = await fetch(uploadResult.url, {
            method: 'OPTIONS'
          });
          
          const corsHeaders = {
            'access-control-allow-origin': corsResponse.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': corsResponse.headers.get('access-control-allow-methods'),
            'access-control-allow-headers': corsResponse.headers.get('access-control-allow-headers'),
            'access-control-max-age': corsResponse.headers.get('access-control-max-age')
          };

          results.push({
            test: "CORS Headers",
            status: corsHeaders['access-control-allow-origin'] ? "✅ PASS" : "⚠️ PARTIAL",
            details: `Origin: ${corsHeaders['access-control-allow-origin'] || 'Not set'}\nMethods: ${corsHeaders['access-control-allow-methods'] || 'Not set'}`,
            data: { corsHeaders, status: corsResponse.status }
          });
        } catch (corsError) {
          results.push({
            test: "CORS Headers",
            status: "❌ FAIL",
            details: `CORS check failed: ${corsError.message}`,
            data: { error: corsError }
          });
        }
      }

      // Test 9: Network Connectivity 
      console.log('🌍 Testing network connectivity...');
      try {
        const connectivityTests = [];
        
        // Test connection to Supabase
        const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
        try {
          const supabaseResponse = await fetch(`https://${supabaseHost}/rest/v1/`, { 
            method: 'HEAD',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }
          });
          connectivityTests.push({
            target: 'Supabase API',
            host: supabaseHost,
            status: supabaseResponse.status,
            success: supabaseResponse.ok
          });
        } catch (supabaseError) {
          connectivityTests.push({
            target: 'Supabase API',
            host: supabaseHost,
            status: 'ERROR',
            success: false,
            error: supabaseError.message
          });
        }

        // Test connection to Supabase Storage
        try {
          const storageResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket/vehicle-images`, {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          });
          connectivityTests.push({
            target: 'Supabase Storage',
            host: supabaseHost,
            status: storageResponse.status,
            success: storageResponse.ok
          });
        } catch (storageError) {
          connectivityTests.push({
            target: 'Supabase Storage',
            host: supabaseHost,
            status: 'ERROR',
            success: false,
            error: storageError.message
          });
        }

        const successfulConnections = connectivityTests.filter(t => t.success).length;
        results.push({
          test: "Network Connectivity",
          status: successfulConnections > 0 ? "✅ PASS" : "❌ FAIL",
          details: `${successfulConnections}/${connectivityTests.length} connections successful`,
          data: { connectivityTests }
        });

      } catch (networkError) {
        results.push({
          test: "Network Connectivity",
          status: "❌ FAIL",
          details: `Network test failed: ${networkError.message}`,
          data: { error: networkError }
        });
      }

    } catch (error) {
      results.push({
        test: "Test Suite Error",
        status: "❌ CRITICAL",
        details: `Test suite failed: ${error.message}`,
        data: { error }
      });
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    if (status.includes('✅')) return 'text-green-600 bg-green-50 border-green-200';
    if (status.includes('❌')) return 'text-red-600 bg-red-50 border-red-200';
    if (status.includes('⚠️')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const cleanup = async () => {
    setLoading(true);
    try {
      const result = await cleanupTestFiles();
      alert(result.success ? result.message : `Cleanup failed: ${result.error}`);
    } catch (error) {
      alert(`Cleanup error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🧪 Enhanced Storage Diagnostics</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">🔍 Comprehensive Testing</h2>
          <p className="text-blue-700 text-sm mb-3">
            This enhanced test suite will thoroughly check your Supabase storage configuration, 
            URL generation, network connectivity, and image accessibility to help diagnose upload issues.
          </p>
          <div className="text-blue-700 text-xs space-y-1">
            <p>• Environment variable validation</p>
            <p>• Bucket configuration and accessibility</p>
            <p>• Image upload and URL generation</p>
            <p>• Network connectivity and CORS headers</p>
            <p>• Browser image loading capabilities</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Diagnostic Controls</h2>
            <div className="flex gap-3">
              <button
                onClick={cleanup}
                disabled={loading}
                className={`px-4 py-2 rounded font-semibold text-white transition-colors ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                🧹 Cleanup Test Files
              </button>
              <button
                onClick={runComprehensiveTest}
                disabled={loading}
                className={`px-6 py-2 rounded font-semibold text-white transition-colors ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? '🔄 Running Tests...' : '🚀 Run Full Diagnostic'}
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Running comprehensive diagnostics...</p>
              <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
            </div>
          )}
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                📊 Test Results
                <span className="text-sm font-normal text-gray-600">
                  ({testResults.filter(r => r.status.includes('✅')).length} passed, 
                   {testResults.filter(r => r.status.includes('❌')).length} failed)
                </span>
              </h3>
              
              {testResults.map((result, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-lg">{result.test}</h4>
                    <span className="font-bold text-sm px-2 py-1 rounded">
                      {result.status}
                    </span>
                  </div>
                  
                  <div className="text-sm mb-3 whitespace-pre-line">
                    {result.details}
                  </div>
                  
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium mb-2 text-gray-700">
                        🔍 Technical Details
                      </summary>
                      <pre className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">🛠️ Troubleshooting Guide</h2>
          <div className="text-sm space-y-3 text-gray-700">
            <div className="bg-white p-3 rounded border-l-4 border-red-500">
              <h4 className="font-semibold text-red-700">❌ If Environment Variables Fail:</h4>
              <p>Check your <code>.env.local</code> file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly.</p>
            </div>
            
            <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
              <h4 className="font-semibold text-yellow-700">⚠️ If Bucket Doesn't Exist:</h4>
              <p>Go to your Supabase dashboard → Storage → Create a new bucket named "vehicle-images" and set it to Public.</p>
            </div>
            
            <div className="bg-white p-3 rounded border-l-4 border-blue-500">
              <h4 className="font-semibold text-blue-700">🔗 If URLs Return 404:</h4>
              <p>Check that your bucket is set to Public in Supabase dashboard and RLS policies aren't blocking access.</p>
            </div>
            
            <div className="bg-white p-3 rounded border-l-4 border-purple-500">
              <h4 className="font-semibold text-purple-700">🌐 If Network Tests Fail:</h4>
              <p>Check your internet connection and firewall settings. Corporate networks may block Supabase.</p>
            </div>
            
            <div className="bg-white p-3 rounded border-l-4 border-green-500">
              <h4 className="font-semibold text-green-700">✅ If All Tests Pass:</h4>
              <p>The storage configuration is working. The issue is likely in the vehicle form or image processing logic.</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">📧 Need Help?</h4>
            <p className="text-blue-700 text-sm">
              If you're still having issues after running these tests, copy the technical details from any failed tests 
              and contact support with the specific error information.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}