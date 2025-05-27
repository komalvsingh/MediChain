import { Plus, Upload, FileText, Eye, Download, X, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useMediChain } from '../context/BlockChainContext';
import { uploadEncryptedFile, fetchAndDecryptFile, createDownloadableUrl, downloadFile } from '../utils/ipfsUtils';

const HealthRecordsTab = () => {
  const {
    account,  
    medicalReports,
    loading,
    uploadReport,
    fetchMedicalReports,
    userHealthID
  } = useMediChain();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch medical reports on component mount
  useEffect(() => {
    if (account && medicalReports.length === 0) {
      fetchMedicalReports();
    }
  }, [account]);

  // Generate a default encryption key based on user's account
  useEffect(() => {
    if (account && !encryptionKey) {
      // Generate a deterministic key based on the user's address
      // In production, you might want to use a more secure method
      setEncryptionKey(`medichain_${account.slice(0, 8)}_${account.slice(-8)}`);
    }
  }, [account]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !reportType || !encryptionKey) {
      alert('Please fill in all required fields');
      return;
    }

    if (!userHealthID) {
      alert('You need a HealthID to upload medical records');
      return;
    }

    try {
      setUploading(true);

      // Upload encrypted file to IPFS
      const metadata = {
        patientId: userHealthID,
        reportType: reportType,
        description: reportDescription,
        timestamp: Date.now(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      };

      const ipfsHash = await uploadEncryptedFile(selectedFile, encryptionKey, metadata);
      
      // Store the IPFS hash on the blockchain
      await uploadReport(ipfsHash);

      // Reset form
      setSelectedFile(null);
      setReportType('');
      setReportDescription('');
      setShowUploadModal(false);
      fileInputRef.current.value = '';

      alert('Medical record uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload medical record. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleViewReport = async (ipfsHash) => {
    if (!encryptionKey) {
      alert('Encryption key is required to view the report');
      return;
    }

    try {
      setDecrypting(true);
      setViewingReport(ipfsHash);
      
      const decrypted = await fetchAndDecryptFile(ipfsHash, encryptionKey);
      setDecryptedContent(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      alert('Failed to decrypt the report. Please check your encryption key.');
      setViewingReport(null);
    } finally {
      setDecrypting(false);
    }
  };

  const handleDownloadReport = async (ipfsHash, fileName = 'medical_report') => {
    try {
      const decrypted = await fetchAndDecryptFile(ipfsHash, encryptionKey);
      const downloadUrl = createDownloadableUrl(decrypted, 'text/plain');
      downloadFile(downloadUrl, `${fileName}.txt`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the report');
    }
  };

  const closeViewModal = () => {
    setViewingReport(null);
    setDecryptedContent('');
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Health Records</h2>
          <p className="text-gray-600">Please connect your wallet to view your health records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Health Records</h2>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
          disabled={!userHealthID}
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add Record
        </button>
      </div>

      {!userHealthID && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You need a HealthID to upload medical records. Please contact an administrator to mint your HealthID.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {medicalReports.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-lg rounded-xl border border-white/20">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No medical records found. Upload your first record to get started.</p>
          </div>
        ) : (
          medicalReports.map((ipfsHash, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Medical Record #{index + 1}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                  Encrypted
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">IPFS Hash: {ipfsHash.slice(0, 12)}...</p>
              <p className="text-sm text-gray-600 mb-4">Stored on blockchain</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleViewReport(ipfsHash)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </button>
                <button 
                  onClick={() => handleDownloadReport(ipfsHash, `medical_record_${index + 1}`)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Medical Record</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type *
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select type...</option>
                  <option value="lab-results">Lab Results</option>
                  <option value="x-ray">X-Ray</option>
                  <option value="blood-test">Blood Test</option>
                  <option value="ecg">ECG Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="medical-scan">Medical Scan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Brief description of the medical record..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encryption Key *
                </label>
                <input
                  type="password"
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter encryption key..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Keep this key safe - you'll need it to access your records
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !reportType || !encryptionKey}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 inline mr-2" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
      {/* ... existing modal header ... */}
      
      {decrypting ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Decrypting report...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">IPFS Hash: {viewingReport}</p>
            
            {/* Check if content is an image */}
            {decryptedContent.match(/^�PNG|^\x89PNG/) ? (
              <img 
                src={`data:image/png;base64,${btoa(decryptedContent)}`} 
                alt="Medical report"
                className="max-w-full h-auto"
              />
            ) : (
              <div className="bg-white rounded p-3 font-mono text-sm max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{decryptedContent}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecordsTab;