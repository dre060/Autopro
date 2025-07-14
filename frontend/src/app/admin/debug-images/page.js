// frontend/src/app/admin/debug-images/page.js - ENHANCED VERSION
"use client";

import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { 
  testImageUpload, 
  checkStorageConfig, 
  setupStorageBucket,
  supabase 
} from "@/lib/supabase";

export default function DebugImages() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runTest = async (testName, testFunction) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    addLog(`Starting ${testName}...`, 'info');
    
    try {
      const result = await testFunction();
      setResults(prev => ({ ...prev, [testName]: result }));
      
      if (result.success) {
        addLog(`✅ ${testName} completed successfully`, 'success');
      } else {
        addLog(`❌ ${testName} failed: ${result.error?.message || result.error}`, 'error');
      }
      
      return result;
    } catch (error) {
      const errorMsg = error.message || error;
      addLog(`❌ ${testName} error: ${errorMsg}`, 'error');
      setResults(prev => ({ ...prev, [testName]: { success: false, error: errorMsg } }));
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const testStorageConfig = () => runTest('Storage Config', checkStorageConfig);
  
  const testBucketSetup = () => runTest('Bucket Setup', setupStorageBucket);
  
  const testImageUploadFunc = () => runTest('Image Upload', testImageUpload);

  const testDirectUpload = async () => {
    return runTest('Direct Upload', async () => {
      // Create test file
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.fillText('Direct Upload Test', 30, 80);
      ctx.fillText(new Date().toLocaleTimeString(), 40, 100);
      
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          try {
            const fileName = `direct-test-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            addLog(`Uploading ${fileName}...`);
            
            const { data, error } = await supabase.storage
              .from('vehicle-images')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'image/png'
              });
            
            if (error) {
              throw error;
            }
            
            addLog('Upload successful, getting URL...');
            
            const { data: urlData } = supabase.storage
              .from('vehicle-images')
              .getPublicUrl(fileName);
            
            addLog(`Generated URL: ${urlData.publicUrl}`);
            
            // Test URL
            const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
            if (!response.ok) {
              throw new Error(`URL not accessible: ${response.status}`);
            }
            
            resolve({
              success: true,
              fileName,
              url: urlData.publicUrl,
              message: 'Direct upload successful and URL verified'
            });
            
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
    });
  };

  const runAllTests = async () => {
    clearLogs();
    addLog('🚀 Starting comprehensive storage tests...', 'info');
    
    await testStorageConfig();
    await testBucketSetup();
    await testDirectUpload();
    await testImageUploadFunc();
    
    addLog('🏁 All tests completed', 'info');
  };

  const deleteBucketFiles = async () => {
    return runTest('Delete Test Files', async () => {
      const { data: files, error: listError } = await supabase.storage
        .from('vehicle-images')
        .list('');
      
      if (listError) throw listError;
      
      const testFiles = files.filter(file => 
        file.name.includes('test') || file.name.includes('direct-test')
      );
      
      if (testFiles.length === 0) {
        return { success: true, message: 'No test files to delete' };
      }
      
      const fileNames = testFiles.map(f => f.name);
      const { error: deleteError } = await supabase.storage
        .from('vehicle-images')
        .remove(fileNames);
      
      if (deleteError) throw deleteError;
      
      return { 
        success: true, 
        message: `Deleted ${fileNames.length} test files`,
        deletedFiles: fileNames
      };
    });
  };

  const LogDisplay = () => (
    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">Debug Logs</h3>
        <button
          onClick={clearLogs}
          className="text-gray-400 hover:text-white text-xs"
        >
          Clear
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="text-gray-500">No logs yet...</p>
      ) : (
        logs.map((log, index) => (
          <div key={index} className={`mb-1 ${
            log.type === 'error' ? 'text-red-400' :
            log.type === 'success' ? 'text-green-400' :
            'text-gray-300'
          }`}>
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))
      )}
    </div>
  );

  const ResultCard = ({ title, result, isLoading }) => (
    <div className={`p-4 rounded-lg border ${
      !result ? 'bg-gray-50 border-gray-200' :
      result.success ? 'bg-green-50 border-green-200' :
      'bg-red-50 border-red-200'
    }`}>
      <h3 className="font-bold mb-2 flex items-center gap-2">
        {title}
        {isLoading && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>}
      </h3>
      
      {!result ? (
        <p className="text-gray-500">Not tested yet</p>
      ) : result.success ? (
        <div>
          <p className="text-green-700 font-medium">✅ Success</p>
          {result.message && <p className="text-sm text-gray-600 mt-1">{result.message}</p>}
          {result.url && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">Generated URL:</p>
              <a href={result.url} target="_blank" className="text-xs text-blue-600 break-all hover:underline">
                {result.url}
              </a>
            </div>
          )}
          {result.bucket && (
            <div className="mt-2 text-xs text-gray-600">
              <p>Bucket: {result.bucket.name} (Public: {result.bucket.public ? 'Yes' : 'No'})</p>
              {result.fileCount !== undefined && <p>Files in bucket: {result.fileCount}</p>}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-red-700 font-medium">❌ Failed</p>
          <p className="text-sm text-red-600 mt-1">{result.error?.message || result.error}</p>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Storage Debug & Testing</h1>
        
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runAllTests}
              disabled={Object.values(loading).some(Boolean)}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {Object.values(loading).some(Boolean) && (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              )}
              Run All Tests
            </button>
            
            <button
              onClick={testStorageConfig}
              disabled={loading.storageConfig}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Check Config
            </button>
            
            <button
              onClick={testBucketSetup}
              disabled={loading.bucketSetup}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-400"
            >
              Setup Bucket
            </button>
            
            <button
              onClick={testDirectUpload}
              disabled={loading.directUpload}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              Test Upload
            </button>
            
            <button
              onClick={deleteBucketFiles}
              disabled={loading.deleteFiles}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              Clean Test Files
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <ResultCard 
            title="Storage Configuration" 
            result={results['Storage Config']} 
            isLoading={loading['Storage Config']}
          />
          <ResultCard 
            title="Bucket Setup" 
            result={results['Bucket Setup']} 
            isLoading={loading['Bucket Setup']}
          />
          <ResultCard 
            title="Direct Upload Test" 
            result={results['Direct Upload']} 
            isLoading={loading['Direct Upload']}
          />
          <ResultCard 
            title="Image Upload Function" 
            result={results['Image Upload']} 
            isLoading={loading['Image Upload']}
          />
        </div>

        {/* Log Display */}
        <LogDisplay />

        {/* Environment Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-bold mb-2">Environment Information</h3>
          <div className="text-sm text-gray-600">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-yellow-800 mb-4">Troubleshooting Guide</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>If Storage Config fails:</strong> Check your Supabase environment variables</p>
            <p><strong>If Bucket Setup fails:</strong> You may need admin permissions in Supabase</p>
            <p><strong>If Upload succeeds but URLs don't work:</strong> Check bucket public access and RLS policies</p>
            <p><strong>If getting 400 errors:</strong> Verify the bucket exists and is properly configured</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}