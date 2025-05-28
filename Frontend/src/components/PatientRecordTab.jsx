import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, User, Wallet, RefreshCw, AlertCircle, ArrowLeft, Send, Shield, Clock, Check, X, Users } from 'lucide-react';
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
  const [pendingRequests, setPendingRequests] = useState([]);
  const [grantedAccess, setGrantedAccess] = useState([]);
  const [isPatientView, setIsPatientView] = useState(false);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [revokingAccess, setRevokingAccess] = useState(false);

  const MEDVAULT_CONTRACT_ADDRESS = "0xD51BEd74dBAf5A3A114bc4973E23676a878A4DAD";
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

  // Check if current user is the patient
  useEffect(() => {
    if (account && patient?.walletAddress) {
      setIsPatientView(account.toLowerCase() === patient.walletAddress.toLowerCase());
    }
  }, [account, patient?.walletAddress]);

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

        // If this is patient view, we might want to show pending requests from doctors
        // Note: Contract doesn't have a direct way to get all pending requests
        // This would need to be implemented by listening to events or maintaining a list
        
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
        fileName: Medical Report ${index + 1},
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
      
      alert(Access request sent to ${patient.name}!\nTransaction: ${tx.hash}\nWaiting for patient approval.);
      setHasPendingRequest(true);
      
    } catch (error) {
      console.error('Error requesting access:', error);
      let errorMessage = 'Failed to request access';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.reason === "Cannot request access to own records") {
        errorMessage = 'You cannot request access to your own records';
      } else if (error.reason === "Access already granted") {
        errorMessage = 'Access has already been granted';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(Error: ${errorMessage});
    } finally {
      setRequestingAccess(false);
    }
  };

  // Approve or deny access request (for patients)
  const handleApproveAccess = async (doctorAddress, grant) => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      setProcessingApproval(true);
      
      // Check if there's a pending request
      const pending = await contract.hasPendingRequest(account, doctorAddress);
      if (!pending) {
        alert('No pending request from this doctor');
        return;
      }

      const gasEstimate = await contract.approveAccess.estimateGas(doctorAddress, grant);
      const gasLimit = gasEstimate * 120n / 100n;
      
      const tx = await contract.approveAccess(doctorAddress, grant, { gasLimit });
      console.log('Approval transaction:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(Access ${grant ? 'granted' : 'denied'} successfully!\nTransaction: ${tx.hash});
      
      // Refresh status
      await checkStatus();
      
    } catch (error) {
      console.error('Error processing approval:', error);
      let errorMessage = 'Failed to process approval';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason === "No pending request from this doctor") {
        errorMessage = 'No pending request from this doctor';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(Error: ${errorMessage});
    } finally {
      setProcessingApproval(false);
    }
  };

  // Revoke access (for patients)
  const handleRevokeAccess = async (doctorAddress) => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      setRevokingAccess(true);
      
      const gasEstimate = await contract.revokeAccess.estimateGas(doctorAddress);
      const gasLimit = gasEstimate * 120n / 100n;
      
      const tx = await contract.revokeAccess(doctorAddress, { gasLimit });
      console.log('Revoke access transaction:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(Access revoked successfully!\nTransaction: ${tx.hash});
      
      // Refresh status
      await checkStatus();
      
    } catch (error) {
      console.error('Error revoking access:', error);
      let errorMessage = 'Failed to revoke access';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(Error: ${errorMessage});
    } finally {
      setRevokingAccess(false);
    }
  };

  // Check pending request status using contract helper function
  const checkRequestStatus = async (doctorAddress) => {
    if (!contract || !account) return { pending: false, granted: false };
    
    try {
      const result = await contract.getPendingRequestStatus(account, doctorAddress);
      return { pending: result.pending, granted: result.granted };
    } catch (error) {
      console.error('Error checking request status:', error);
      return { pending: false, granted: false };
    }
  };

  const handleDownload = async (ipfsHash, fileName) => {
    try {
      if (!hasAccess && account.toLowerCase() !== patient.walletAddress.toLowerCase()) {
        alert('You do not have access to download this report');
        return;
      }

      const ipfsUrl = https://ipfs.io/ipfs/${ipfsHash};
      window.open(ipfsUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file: ' + err.message);
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
                <h1 className="text-xl font-semibold text-gray-900">
                  {isPatientView ? 'My Medical Records' : 'Medical Records'}
                </h1>
                <p className="text-sm text-gray-600">
                  {isPatientView ? 'Manage your medical records and access permissions' : Patient: ${patient.name}}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!isPatientView && !hasAccess && (
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
                      ${patient.walletAddress.slice(0, 6)}...${patient.walletAddress.slice(-4)} : 
                      'No wallet connected'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className={`text-sm font-medium ${
                    isPatientView
                      ? 'text-blue-600' 
                      : hasAccess 
                        ? 'text-green-600' 
                        : hasPendingRequest 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                  }`}>
                    {isPatientView
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

        {/* Access Management Section (for patients) */}
        {isPatientView && (
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Access Management
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage who can access your medical records
              </p>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Management</h3>
                <p className="text-gray-600 mb-4">
                  To manage access requests and permissions, you would need to implement event listening 
                  or maintain a list of doctors who have requested access.
                </p>
                <p className="text-sm text-gray-500">
                  The contract supports approveAccess() and revokeAccess() functions, 
                  but requires additional implementation to track and display pending requests.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Medical Reports */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Loading...' : ${medicalReports.length} report(s) found}
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
                {error.includes('permission') && !hasPendingRequest && !isPatientView && (
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