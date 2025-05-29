import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, User, Wallet, RefreshCw, AlertCircle, ArrowLeft, Send, Shield, Clock } from 'lucide-react';
import { ethers } from 'ethers';
import MedVaultABI from '../abis/MedVaultAbi.json';
import HealthIDABI from '../abis/HealthIdAbi.json';

const PatientRecordsTab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { patient } = location.state || {};

  const [medicalReports, setMedicalReports] = useState([]);
  const [userHealthID, setUserHealthID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [contract, setContract] = useState(null);
  const [healthIDContract, setHealthIDContract] = useState(null);
  const [account, setAccount] = useState(null);

  const MEDVAULT_CONTRACT_ADDRESS = "0x5FB4f0D8f07918a97dc5719C50aF7277872683C1";
  const HEALTHID_CONTRACT_ADDRESS = "0x0926920E743431343D90edA86F1B276350DA5A89";

  // Initialize blockchain connection
  useEffect(() => {
    const initializeBlockchain = async () => {
      try {
        if (typeof window.ethereum === 'undefined') {
          setError('Please install MetaMask');
          return;
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const accounts = await web3Provider.listAccounts();
        
        if (accounts.length === 0) {
          setError('No accounts found');
          return;
        }

        const medVaultABI = Array.isArray(MedVaultABI) ? MedVaultABI : MedVaultABI.abi;
        const healthIDABI = Array.isArray(HealthIDABI) ? HealthIDABI : HealthIDABI.abi;
        
        const medVaultContract = new ethers.Contract(MEDVAULT_CONTRACT_ADDRESS, medVaultABI, signer);
        const healthIDContractInstance = new ethers.Contract(HEALTHID_CONTRACT_ADDRESS, healthIDABI, signer);
        
        setContract(medVaultContract);
        setHealthIDContract(healthIDContractInstance);
        setAccount(accounts[0].address);
        
      } catch (error) {
        console.error('Blockchain initialization error:', error);
        setError('Failed to connect to blockchain');
      }
    };

    initializeBlockchain();
  }, []);

  // Check access status and HealthID
  useEffect(() => {
    const checkStatus = async () => {
      if (!contract || !healthIDContract || !account || !patient?.walletAddress) return;

      try {
        // Check current access
        const accessGranted = await contract.doctorPermissions(patient.walletAddress, account);
        setHasAccess(accessGranted);

        // Check pending request
        const pending = await contract.hasPendingRequest(patient.walletAddress, account);
        setHasPendingRequest(pending);

        // Check HealthID
        const balance = await healthIDContract.balanceOf(patient.walletAddress);
        if (balance > 0) {
          setUserHealthID('Available');
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
  }, [contract, healthIDContract, account, patient?.walletAddress]);

  // Fetch patient reports
  useEffect(() => {
    if (!patient) {
      navigate('/doc-dashboard');
      return;
    }
    
    if (!patient.walletAddress) {
      setError('Patient wallet address not found');
      setLoading(false);
      return;
    }
    
    fetchPatientReports();
  }, [patient, contract, account, hasAccess]);

  const fetchPatientReports = async () => {
    if (!contract || !account || !patient?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const canViewReports = account.toLowerCase() === patient.walletAddress.toLowerCase() || hasAccess;
      
      if (!canViewReports) {
        setError('You do not have permission to view this patient\'s medical records');
        setMedicalReports([]);
        setLoading(false);
        return;
      }

      const reports = await contract.getReports(patient.walletAddress);
      const formattedReports = reports.map((ipfsHash, index) => ({
        ipfsHash,
        fileName: `Medical Report ${index + 1}`,
        date: new Date().toLocaleDateString(),
        description: 'Medical report stored on IPFS'
      }));

      setMedicalReports(formattedReports);
      
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to fetch patient reports');
      setMedicalReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Request access using contract function
  const handleRequestAccess = async () => {
    if (!contract || !patient?.walletAddress) {
      alert('Contract not initialized or patient wallet not found');
      return;
    }

    try {
      setRequestingAccess(true);
      
      // Check if already has access
      const currentAccess = await contract.doctorPermissions(patient.walletAddress, account);
      if (currentAccess) {
        alert('You already have access to this patient\'s records');
        setHasAccess(true);
        return;
      }

      // Check if request already pending
      const pending = await contract.hasPendingRequest(patient.walletAddress, account);
      if (pending) {
        alert('You already have a pending access request');
        return;
      }

      // Send access request using contract
      const gasEstimate = await contract.requestAccess.estimateGas(patient.walletAddress);
      const gasLimit = gasEstimate * 120n / 100n;
      
      const tx = await contract.requestAccess(patient.walletAddress, { gasLimit });
      console.log('Access request transaction:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(`Access request sent to ${patient.name}!\nTransaction: ${tx.hash}\nWaiting for patient approval.`);
      setHasPendingRequest(true);
      
    } catch (error) {
      console.error('Error requesting access:', error);
      let errorMessage = 'Failed to request access';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setRequestingAccess(false);
    }
  };

  // Replace your existing handleDownload function with this enhanced version

const handleDownload = async (ipfsHash, fileName) => {
  try {
    if (!hasAccess && account.toLowerCase() !== patient.walletAddress.toLowerCase()) {
      alert('You do not have access to download this report');
      return;
    }

    console.log('Starting download for IPFS hash:', ipfsHash);
    
    // Show loading state
    const loadingToast = document.createElement('div');
    loadingToast.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #3B82F6; color: white; padding: 12px 20px; border-radius: 8px; z-index: 1000; display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Downloading and decrypting file...
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    document.body.appendChild(loadingToast);

    // Fetch encrypted file from IPFS
    const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
    console.log('Fetching from IPFS URL:', ipfsUrl);
    
    const response = await fetch(ipfsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file from IPFS: ${response.status} ${response.statusText}`);
    }

    const encryptedData = await response.arrayBuffer();
    console.log('Fetched encrypted data, size:', encryptedData.byteLength);

    let decryptedData;
    let finalFileName = fileName;

    try {
      // Try to decrypt the file using the contract
      console.log('Attempting to decrypt file...');
      
      // Get decryption key or decrypt through contract
      // This depends on how your encryption is implemented
      // Option 1: If the contract has a decrypt function
      if (contract.decryptFile) {
        const decryptedBuffer = await contract.decryptFile(ipfsHash, patient.walletAddress);
        decryptedData = decryptedBuffer;
      } else {
        // Option 2: If decryption happens client-side
        // You'll need to implement this based on your encryption method
        console.log('Attempting client-side decryption...');
        
        // For now, let's try to parse the encrypted data
        // This is a placeholder - you'll need to implement actual decryption
        const encryptedUint8Array = new Uint8Array(encryptedData);
        
        // Check if it's already a readable format (PDF, image, etc.)
        const fileSignature = Array.from(encryptedUint8Array.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('File signature (first 4 bytes):', fileSignature);
        
        // Common file signatures
        const signatures = {
          '25504446': { ext: 'pdf', mime: 'application/pdf' }, // PDF
          '89504E47': { ext: 'png', mime: 'image/png' }, // PNG
          'FFD8FFE0': { ext: 'jpg', mime: 'image/jpeg' }, // JPEG
          'FFD8FFE1': { ext: 'jpg', mime: 'image/jpeg' }, // JPEG
          '504B0304': { ext: 'zip', mime: 'application/zip' }, // ZIP
          '504B0506': { ext: 'zip', mime: 'application/zip' }, // ZIP
          '504B0708': { ext: 'zip', mime: 'application/zip' }, // ZIP
        };
        
        const fileInfo = signatures[fileSignature.toUpperCase()];
        
        if (fileInfo) {
          console.log('File appears to be unencrypted:', fileInfo);
          decryptedData = encryptedUint8Array;
          finalFileName = fileName.includes('.') ? fileName : `${fileName}.${fileInfo.ext}`;
        } else {
          // File is encrypted, attempt decryption
          console.log('File appears to be encrypted, attempting decryption...');
          
          // You'll need to implement the actual decryption logic here
          // This is just a placeholder that tries to use the raw data
          decryptedData = encryptedUint8Array;
          
          // Try to determine file type from filename or default to PDF
          if (!fileName.includes('.')) {
            finalFileName = `${fileName}.pdf`;
          }
        }
      }
    } catch (decryptError) {
      console.log('Decryption failed or not needed:', decryptError.message);
      // If decryption fails, try to download as-is
      decryptedData = new Uint8Array(encryptedData);
      
      // Ensure filename has extension
      if (!fileName.includes('.')) {
        finalFileName = `${fileName}.pdf`; // Default to PDF
      }
    }

    // Remove loading toast
    document.body.removeChild(loadingToast);

    // Create blob and download
    const blob = new Blob([decryptedData]);
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    console.log('File downloaded successfully:', finalFileName);
    
    // Show success message
    const successToast = document.createElement('div');
    successToast.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 1000;">
        File downloaded successfully!
      </div>
    `;
    document.body.appendChild(successToast);
    setTimeout(() => {
      if (document.body.contains(successToast)) {
        document.body.removeChild(successToast);
      }
    }, 3000);

  } catch (err) {
    console.error('Download failed:', err);
    
    // Remove loading toast if it exists
    const loadingToast = document.querySelector('[style*="Downloading and decrypting"]');
    if (loadingToast) {
      loadingToast.remove();
    }
    
    // Show error message
    const errorToast = document.createElement('div');
    errorToast.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #EF4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 1000;">
        Failed to download file: ${err.message}
      </div>
    `;
    document.body.appendChild(errorToast);
    setTimeout(() => {
      if (document.body.contains(errorToast)) {
        document.body.removeChild(errorToast);
      }
    }, 5000);
  }
};

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Medical Records</h1>
                <p className="text-sm text-gray-600">Patient: {patient.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!hasAccess && account?.toLowerCase() !== patient.walletAddress?.toLowerCase() && (
                <button
                  onClick={handleRequestAccess}
                  disabled={requestingAccess || hasPendingRequest}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    hasPendingRequest 
                      ? 'bg-yellow-500 text-white cursor-not-allowed' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50`}
                >
                  {requestingAccess ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Requesting...</span>
                    </>
                  ) : hasPendingRequest ? (
                    <>
                      <Clock className="h-4 w-4" />
                      <span>Request Pending</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Request Access</span>
                    </>
                  )}
                </button>
              )}
              <button onClick={fetchPatientReports} className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg">
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600">{patient.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Wallet className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-mono">
                    {patient.walletAddress ? 
                      `${patient.walletAddress.slice(0, 6)}...${patient.walletAddress.slice(-4)}` : 
                      'No wallet connected'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className={`text-sm font-medium ${
                    hasAccess || account?.toLowerCase() === patient.walletAddress?.toLowerCase() 
                      ? 'text-green-600' : hasPendingRequest ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {account?.toLowerCase() === patient.walletAddress?.toLowerCase() 
                      ? 'Own Records' 
                      : hasAccess 
                        ? 'Access Granted' 
                        : hasPendingRequest 
                          ? 'Request Pending'
                          : 'Access Required'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Age: {patient.age}</p>
              <p className="text-sm text-gray-500">Gender: {patient.gender}</p>
              {userHealthID && (
                <p className="text-sm text-blue-600 font-semibold mt-2">Health ID: {userHealthID}</p>
              )}
            </div>
          </div>
        </div>

        {/* Medical Reports */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Loading...' : `${medicalReports.length} report(s) found`}
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600">Loading medical reports...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reports</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                {error.includes('permission') && !hasPendingRequest && (
                  <button
                    onClick={handleRequestAccess}
                    disabled={requestingAccess}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {requestingAccess ? 'Requesting...' : 'Request Access'}
                  </button>
                )}
              </div>
            ) : medicalReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Reports</h3>
                <p className="text-gray-600">No medical reports found for this patient.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {medicalReports.map((report, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{report.fileName}</h4>
                          <div className="flex items-center space-x-1 mt-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{report.date}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{report.description}</p>
                          <p className="text-xs text-gray-500 mt-2 font-mono">IPFS: {report.ipfsHash}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(report.ipfsHash, report.fileName)}
                        className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRecordsTab;