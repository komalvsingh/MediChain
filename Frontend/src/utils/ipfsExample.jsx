/**
 * Example component demonstrating how to use the IPFS utilities with MediChain
 * 
 * This component shows how to:
 * 1. Upload encrypted medical reports to IPFS
 * 2. Store the IPFS hash on the blockchain
 * 3. Retrieve and decrypt medical reports from IPFS
 */

import React, { useState } from 'react';
import { useMediChain } from '../context/BlockChainContext';
import {
  uploadEncryptedFile,
  fetchAndDecryptFile,
  createDownloadableUrl,
  downloadFile
} from './ipfsUtils';

const IPFSMedicalReportManager = () => {
  const { account, uploadReport, medicalReports, loading } = useMediChain();
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [viewingReport, setViewingReport] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  // Handle encryption key input
  const handleKeyChange = (e) => {
    setEncryptionKey(e.target.value);
    setError('');
  };

  // Upload encrypted file to IPFS and store hash on blockchain
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!encryptionKey) {
      setError('Please enter an encryption key');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      // Create metadata for the file
      const metadata = {
        patientAddress: account,
        reportType: selectedFile.type,
        fileName: selectedFile.name,
        timestamp: Date.now()
      };

      // Upload encrypted file to IPFS
      const ipfsHash = await uploadEncryptedFile(selectedFile, encryptionKey, metadata);
      
      // Store the IPFS hash on the blockchain
      await uploadReport(ipfsHash);
      
      setSuccess(`Medical report uploaded successfully! IPFS Hash: ${ipfsHash}`);
      setSelectedFile(null);
      
      // Reset file input
      document.getElementById('file-upload').value = '';
    } catch (error) {
      console.error('Error uploading medical report:', error);
      setError(`Upload failed: ${error.message}`);
    }
  };

  // View and decrypt a medical report
  const handleViewReport = async (ipfsHash) => {
    if (!encryptionKey) {
      setError('Please enter the encryption key to view this report');
      return;
    }

    try {
      setError('');
      setViewingReport(ipfsHash);
      
      // Fetch and decrypt the report from IPFS
      const decryptedData = await fetchAndDecryptFile(ipfsHash, encryptionKey);
      
      // Determine if it's JSON or binary data
      try {
        // Try to parse as JSON
        const jsonData = JSON.parse(decryptedData);
        setDecryptedContent({
          type: 'json',
          data: jsonData
        });
      } catch {
        // Not JSON, treat as text or binary
        const fileType = determineFileType(decryptedData);
        
        if (fileType === 'text') {
          setDecryptedContent({
            type: 'text',
            data: decryptedData
          });
        } else {
          // Create a blob URL for binary data
          const blobUrl = createDownloadableUrl(decryptedData, 'application/octet-stream');
          setDecryptedContent({
            type: 'binary',
            data: blobUrl,
            originalData: decryptedData
          });
        }
      }
    } catch (error) {
      console.error('Error viewing medical report:', error);
      setError(`Failed to decrypt report: ${error.message}`);
      setDecryptedContent(null);
    }
  };

  // Helper function to determine file type
  const determineFileType = (data) => {
    // Simple heuristic: if it contains mostly printable ASCII, it's probably text
    const printableChars = data.replace(/[^\x20-\x7E]/g, '');
    return printableChars.length > data.length * 0.8 ? 'text' : 'binary';
  };

  // Download the decrypted file
  const handleDownload = () => {
    if (!decryptedContent || !viewingReport) return;
    
    try {
      if (decryptedContent.type === 'binary') {
        // For binary data, we already have a blob URL
        downloadFile(decryptedContent.data, `decrypted-report-${Date.now()}`);
      } else {
        // For text or JSON, create a downloadable text file
        const content = decryptedContent.type === 'json' 
          ? JSON.stringify(decryptedContent.data, null, 2)
          : decryptedContent.data;
          
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        downloadFile(url, `decrypted-report-${Date.now()}.txt`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError(`Download failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Medical Report Manager</h2>
      
      {/* Encryption Key Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Encryption Key (Keep this secure!)
        </label>
        <input
          type="password"
          value={encryptionKey}
          onChange={handleKeyChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your encryption key"
        />
        <p className="mt-1 text-sm text-gray-500">
          This key will be used to encrypt/decrypt your medical reports. Do not lose it!
        </p>
      </div>
      
      {/* File Upload Section */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <h3 className="text-lg font-medium mb-3">Upload Medical Report</h3>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          className="mb-3"
        />
        <button
          onClick={handleUpload}
          disabled={loading || !selectedFile}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload Encrypted Report'}
        </button>
      </div>
      
      {/* Success/Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {/* Medical Reports List */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-3">Your Medical Reports</h3>
        {medicalReports && medicalReports.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {medicalReports.map((report, index) => (
              <li key={index} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">Report #{index + 1}</p>
                  <p className="text-sm text-gray-500 truncate">{report}</p>
                </div>
                <button
                  onClick={() => handleViewReport(report)}
                  className="ml-2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No medical reports found.</p>
        )}
      </div>
      
      {/* Report Viewer */}
      {viewingReport && decryptedContent && (
        <div className="mt-8 p-4 border border-gray-300 rounded-md">
          <h3 className="text-lg font-medium mb-3">Viewing Report</h3>
          <p className="text-sm text-gray-500 mb-4">IPFS Hash: {viewingReport}</p>
          
          <div className="bg-gray-100 p-4 rounded-md mb-4 max-h-96 overflow-auto">
            {decryptedContent.type === 'json' && (
              <pre className="text-sm">
                {JSON.stringify(decryptedContent.data, null, 2)}
              </pre>
            )}
            
            {decryptedContent.type === 'text' && (
              <div className="whitespace-pre-wrap text-sm">
                {decryptedContent.data}
              </div>
            )}
            
            {decryptedContent.type === 'binary' && (
              <div className="text-center">
                <p>Binary file content (not displayable)</p>
                <button
                  onClick={handleDownload}
                  className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Download File
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Download Report
          </button>
        </div>
      )}
    </div>
  );
};

export default IPFSMedicalReportManager;