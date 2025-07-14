// frontend/src/app/admin/debug-images/page.js - COMPREHENSIVE FIX
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { 
  checkStorageConfig, 
  setupStorageBucket,
  testImageUpload,
  cleanupTestFiles,
  supabase 
} from "@/lib/supabase";

export default function DebugImages() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
    
    // Also log to console with appropriate level
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

  const runTest = async (testName, testFunction) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    addLog(`🚀 Starting ${testName}...`, 'info');
    
    try {
      const result = await testFunction();
      setResults(prev => ({ ...prev, [testName]: result }));
      
      if (result && result.success) {
        addLog(`✅ ${testName} completed successfully: ${result.message || 'OK'}`, 'success');
        if (result.warnings && result.warnings.length > 0) {
          addLog(`⚠️ ${testName} had warnings: ${JSON.stringify(result.warnings)}`, 'warning');
        }
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
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  // Test functions
  const testStorageConfig = () => runTest('Storage Config', checkStorageConfig);
  const testBucketSetup = () => runTest('Bucket Setup', setupStorageBucket);
  const testImageUploadFunc = () => runTest('Image Upload', testImageUpload);
  const testCleanup = () => runTest('Cleanup Test Files', cleanupTestFiles);

  // Enhanced direct upload test
  const testDirectUpload = async () => {
    return runTest('Direct Upload', async () => {
      try {
        // Create a more robust test file
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 300, 200);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(0.5, '#2196F3');
        gradient.addColorStop(1, '#9C27B0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 200);
        
        // Add text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('DIRECT UPLOAD TEST', 50, 100);
        ctx.font = '14px Arial';
        ctx.fillText(`${new Date().toLocaleString()}`, 80, 130);
        
        return new Promise((resolve) => {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve({
                success: false,
                error: 'Failed to create test image blob'
              });
              return;
            }
            
            try {
              const fileName = `direct-test-${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
              const file = new File([blob], fileName, { type: 'image/png' });
              
              addLog(`📤 Uploading ${fileName} (${Math.round(blob.size / 1024)}KB)...`);
              
              // Direct Supabase upload
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: 'image/png'
                });
              
              if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
              }
              
              addLog(`✅ Upload successful: ${uploadData.path}`);
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(fileName);
              
              if (!urlData?.publicUrl) {
                throw new Error('Failed to generate public URL');
              }
              
              addLog(`🔗 Generated URL: ${urlData.publicUrl}`);
              
              // Test URL accessibility with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              try {
                const response = await fetch(urlData.publicUrl, { 
                  method: 'HEAD',
                  signal: controller.signal 
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                  addLog(`⚠️ URL returned ${response.status}: ${response.statusText}`, 'warning');
                } else {
                  addLog(`✅ URL is accessible (${response.status})`, 'success');
                }
              } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                  addLog(`⏱️ URL test timed out (may work after propagation)`, 'warning');
                } else {
                  addLog(`⚠️ URL test failed: ${fetchError.message}`, 'warning');
                }
              }
              
              resolve({
                success: true,
                fileName,
                url: urlData.publicUrl,
                uploadPath: uploadData.path,
                fileSize: Math.round(blob.size / 1024),
                message: `Direct upload successful for ${fileName}`
              });
              
            } catch (error) {
              addLog(`❌ Direct upload error: ${error.message}`, 'error');
              resolve({ 
                success: false, 
                error: error.message 
              });
            }
          }, 'image/png', 0.9);
        });
      } catch (error) {
        return {
          success: false,
          error: `Test setup failed: ${error.message}`
        };
      }
    });
  };

  // Run all tests in sequence
  const runAllTests = async () => {
    clearLogs();
    addLog('🚀 Starting comprehensive storage tests...', 'info');
    
    const startTime = Date.now();
    
    // Run tests in logical order
    await testStorageConfig();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    
    await testBucketSetup();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testDirectUpload();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testImageUploadFunc();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    addLog(`🏁 All tests completed in ${duration} seconds`, 'info');
    
    // Summary
    const testResults = Object.values(results);
    const successful = testResults.filter(r => r?.success).length;
    const total = testResults.length;
    
    if (successful === total) {
      addLog(`🎉 All ${total} tests passed!`, 'success');
    } else {
      addLog(`⚠️ ${successful}/${total} tests passed`, 'warning');
    }
  };

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
          {result.bucket && (
            <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border">
              <p><strong>Bucket:</strong> {result.bucket.name}</p>
              <p><strong>Public:</strong> {result.bucket.public ? 'Yes' : 'No'}</p>
              {result.fileCount !== undefined && (
                <p><strong>Files:</strong> {result.fileCount}</p>
              )}
            </div>
          )}
          {result.fileSize && (
            <p className="text-xs text-gray-600">
              <strong>File Size:</strong> {result.fileSize}KB
            </p>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-medium text-yellow-800">Warnings:</p>
              {result.warnings.map((warning, idx) => (
                <p key={idx} className="text-xs text-yellow-700">• {warning.error}</p>
              ))}
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

  // Log display component
  const LogDisplay = () => (
    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span className="text-green-400">💻</span> Debug Logs
        </h3>
        <button
          onClick={clearLogs}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          Clear Logs
        </button>
      </div>
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
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Storage Debug & Testing Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive testing tools for Supabase storage configuration and image uploads.
          </p>
        </div>
        
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-600">🎮</span> Test Controls
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runAllTests}
              disabled={Object.values(loading).some(Boolean)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-all duration-200 transform hover:scale-105"
            >
              {Object.values(loading).some(Boolean) && (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              )}
              🚀 Run All Tests
            </button>
            
            <button
              onClick={testStorageConfig}
              disabled={loading['Storage Config']}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              🔍 Check Config
            </button>
            
            <button
              onClick={testBucketSetup}
              disabled={loading['Bucket Setup']}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
            >
              🛠️ Setup Bucket
            </button>
            
            <button
              onClick={testDirectUpload}
              disabled={loading['Direct Upload']}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              📤 Test Upload
            </button>
            
            <button
              onClick={testCleanup}
              disabled={loading['Cleanup Test Files']}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              🧹 Clean Test Files
            </button>
          </div>
        </div>

        {/* Results Grid */}
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
            title="📤 Direct Upload Test" 
            result={results['Direct Upload']} 
            isLoading={loading['Direct Upload']}
            testKey="Direct Upload"
          />
          <ResultCard 
            title="🧪 Image Upload Function" 
            result={results['Image Upload']} 
            isLoading={loading['Image Upload']}
            testKey="Image Upload"
          />
        </div>

        {/* Log Display */}
        <div className="mb-8">
          <LogDisplay />
        </div>

        {/* Environment Info */}
        <div className="bg-gray-100 rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span className="text-gray-600">⚙️</span> Environment Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <strong>Supabase URL:</strong> 
                <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <strong>Supabase Key:</strong> 
                <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing'}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
              <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Server'}</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <span>🔧</span> Troubleshooting Guide
          </h3>
          <div className="text-sm text-yellow-800 space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-1">Storage Config Issues:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Check Supabase environment variables</li>
                  <li>Verify project URL and anon key</li>
                  <li>Ensure network connectivity</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Upload Failures:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Check file size limits (50MB max)</li>
                  <li>Verify file format (JPEG, PNG, WebP)</li>
                  <li>Ensure bucket exists and is public</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">URL Access Issues:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Wait for CDN propagation (30-60 seconds)</li>
                  <li>Check bucket public access settings</li>
                  <li>Verify RLS policies allow public read</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Permission Errors:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Check if you have admin/service role access</li>
                  <li>Verify bucket creation permissions</li>
                  <li>Review Supabase project settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}