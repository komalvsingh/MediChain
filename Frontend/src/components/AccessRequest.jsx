import React, { useState, useEffect } from "react";
import { 
  CheckCircle,
  XCircle,
  Shield,
  User,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { ethers } from 'ethers';
import axios from 'axios';
// Import your contract ABI - replace with actual path
import MedVaultABI from '../abis/MedVaultAbi.json'; // Adjust path as needed

export const AccessRequestsPanel = () => {
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  
  const token = localStorage.getItem('token');
  const CONTRACT_ADDRESS = "0x5FB4f0D8f07918a97dc5719C50aF7277872683C1"; // Replace with your deployed contract address

  // Initialize contract and account
  useEffect(() => {
    const initializeContract = async () => {
      try {
        if (typeof window.ethereum === 'undefined') {
          setError("Please install MetaMask to use this feature");
          return;
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const accounts = await web3Provider.listAccounts();
        
        if (accounts.length === 0) {
          setError("No accounts found. Please connect your wallet.");
          return;
        }

        // Handle ABI - check if it's wrapped in an object or is the array directly
        let contractABI;
        if (Array.isArray(MedVaultABI)) {
          contractABI = MedVaultABI;
        } else if (MedVaultABI.abi && Array.isArray(MedVaultABI.abi)) {
          contractABI = MedVaultABI.abi;
        } else {
          throw new Error("Invalid ABI format");
        }
        
        // Create contract instance
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        );
        
        setProvider(web3Provider);
        setContract(contractInstance);
        setAccount(accounts[0].address);
        console.log("Contract initialized successfully");
        
      } catch (error) {
        console.error("Error initializing contract:", error);
        let errorMessage = "Failed to connect to blockchain";
        
        if (error.code === 4001) {
          errorMessage = "User rejected the connection request";
        } else if (error.code === -32002) {
          errorMessage = "Connection request already pending";
        } else if (error.message.includes("Invalid ABI")) {
          errorMessage = "Contract ABI configuration error";
        } else if (error.message.includes("network")) {
          errorMessage = "Network connection error. Please check your connection.";
        }
        
        setError(errorMessage);
      }
    };

    initializeContract();
  }, []);

  // Fetch access requests
  useEffect(() => {
    const fetchAccessRequests = async () => {
      if (!contract || !account || !provider) {
        console.log('Missing dependencies:', { contract: !!contract, account: !!account, provider: !!provider });
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
        
        console.log(`Querying events from block ${fromBlock} to ${currentBlock}`);
        
        // Create filter for AccessRequested events where current account is the patient
        const filter = contract.filters.AccessRequested(null, account);
        const events = await contract.queryFilter(filter, fromBlock, currentBlock);
        
        console.log('Found access request events:', events);
        
        if (events.length === 0) {
          setAccessRequests([]);
          setLoading(false);
          return;
        }
        
        // Get unique doctor addresses and their latest request timestamps
        const doctorRequestMap = new Map();
        
        events.forEach(event => {
          const doctorAddress = event.args[0];
          const blockNumber = event.blockNumber;
          
          if (!doctorRequestMap.has(doctorAddress) || 
              doctorRequestMap.get(doctorAddress).blockNumber < blockNumber) {
            doctorRequestMap.set(doctorAddress, {
              doctorAddress,
              blockNumber,
              transactionHash: event.transactionHash,
              timestamp: null // Will be fetched from block
            });
          }
        });
        
        // Process pending requests only
        const doctorRequests = [];
        
        for (const [doctorAddress, requestInfo] of doctorRequestMap) {
          try {
            // Check if access is already granted
            const hasAccess = await contract.doctorPermissions(account, doctorAddress);
            
            // Skip if already has access
            if (hasAccess) {
              console.log(`Doctor ${doctorAddress} already has access, skipping`);
              continue;
            }
            
            // Get block timestamp for request date
            let requestDate = new Date().toISOString();
            try {
              const block = await provider.getBlock(requestInfo.blockNumber);
              if (block && block.timestamp) {
                requestDate = new Date(block.timestamp * 1000).toISOString();
              }
            } catch (blockError) {
              console.warn('Could not fetch block timestamp:', blockError);
            }
            
            // Fetch doctor info from backend
            try {
              const response = await axios.get(
                `http://localhost:5000/api/auth/doctors/wallet/${doctorAddress}`, 
                {
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 10000 // 10 second timeout
                }
              );
              
              const doctorInfo = response.data;
              
              doctorRequests.push({
                id: doctorAddress,
                doctorName: doctorInfo.name || 'Unknown Doctor',
                doctorAddress: doctorAddress,
                requestDate: requestDate,
                urgency: doctorInfo.urgency || 'medium',
                specialization: doctorInfo.specialization || 'Not specified',
                email: doctorInfo.email || 'Not available',
                hospital: doctorInfo.hospital || 'Not specified',
                profilePicture: doctorInfo.profilePicture,
                transactionHash: requestInfo.transactionHash
              });
              
            } catch (apiError) {
              console.error(`Error fetching doctor info for ${doctorAddress}:`, apiError);
              
              // If doctor not found in backend or API error, show with minimal info
              doctorRequests.push({
                id: doctorAddress,
                doctorName: `Doctor (${doctorAddress.slice(0, 8)}...)`,
                doctorAddress: doctorAddress,
                requestDate: requestDate,
                urgency: 'medium',
                specialization: 'Not available',
                email: 'Not available',
                hospital: 'Not available',
                transactionHash: requestInfo.transactionHash
              });
            }
            
          } catch (contractError) {
            console.error(`Error checking permissions for ${doctorAddress}:`, contractError);
          }
        }
        
        // Sort by request date (newest first)
        doctorRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
        
        setAccessRequests(doctorRequests);
        console.log('Pending requests:', doctorRequests);
        
      } catch (error) {
        console.error("Error fetching access requests:", error);
        let errorMessage = "Failed to load access requests";
        
        if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timeout. Please try again.";
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (contract && account && provider) {
      fetchAccessRequests();
      
      // Set up event listeners for real-time updates
      const handleAccessRequested = async (doctor, patient, event) => {
        console.log('New AccessRequested event:', { doctor, patient });
        if (patient.toLowerCase() === account.toLowerCase()) {
          // Wait a bit for the transaction to be confirmed
          setTimeout(() => {
            fetchAccessRequests();
          }, 2000);
        }
      };
      
      const handleAccessApproved = async (doctor, patient, granted, event) => {
        console.log('AccessApproved event:', { doctor, patient, granted });
        if (patient.toLowerCase() === account.toLowerCase()) {
          fetchAccessRequests();
        }
      };
      
      // Listen for new events
      try {
        contract.on("AccessRequested", handleAccessRequested);
        contract.on("AccessApproved", handleAccessApproved);
        
        return () => {
          try {
            contract.off("AccessRequested", handleAccessRequested);
            contract.off("AccessApproved", handleAccessApproved);
          } catch (error) {
            console.warn("Error removing event listeners:", error);
          }
        };
      } catch (error) {
        console.warn("Error setting up event listeners:", error);
      }
    }
  }, [contract, account, provider, token]);

  const handleApproveAccess = async (doctorAddress) => {
    if (!contract) {
      alert("Contract not initialized");
      return;
    }

    try {
      setProcessingAction(doctorAddress);
      
      // Estimate gas first
      const gasEstimate = await contract.approveAccess.estimateGas(doctorAddress, true);
      const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
      
      // Call the smart contract function
      const tx = await contract.approveAccess(doctorAddress, true, {
        gasLimit: gasLimit
      });
      
      console.log("Approval transaction:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Remove from pending list
      setAccessRequests(prev => prev.filter(req => req.doctorAddress !== doctorAddress));
      alert("Access approved successfully!");
      
    } catch (error) {
      console.error("Error approving access:", error);
      let errorMessage = "Failed to approve access";
      
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.code === -32603) {
        errorMessage = "Transaction failed. Please try again.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message.includes("gas")) {
        errorMessage = "Gas estimation failed. Please try again.";
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectAccess = async (doctorAddress) => {
    if (!contract) {
      alert("Contract not initialized");
      return;
    }

    try {
      setProcessingAction(doctorAddress);
      
      // Estimate gas first
      const gasEstimate = await contract.approveAccess.estimateGas(doctorAddress, false);
      const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
      
      // Call the smart contract function
      const tx = await contract.approveAccess(doctorAddress, false, {
        gasLimit: gasLimit
      });
      
      console.log("Rejection transaction:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Remove from pending list
      setAccessRequests(prev => prev.filter(req => req.doctorAddress !== doctorAddress));
      alert("Access rejected successfully!");
      
    } catch (error) {
      console.error("Error rejecting access:", error);
      let errorMessage = "Failed to reject access";
      
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.code === -32603) {
        errorMessage = "Transaction failed. Please try again.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message.includes("gas")) {
        errorMessage = "Gas estimation failed. Please try again.";
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
        <div className="text-center py-10">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Requests</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Pending Access Requests</h3>
        <span className="bg-blue-100 text-blue-600 text-sm px-2 py-1 rounded-full">
          {accessRequests.length} pending
        </span>
      </div>
      
      {accessRequests.length > 0 ? (
        <div className="space-y-4">
          {accessRequests.map((request) => (
            <div key={request.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center">
                      {request.profilePicture ? (
                        <img src={request.profilePicture} alt={request.doctorName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{request.doctorName}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        {
                          'high': 'bg-red-100 text-red-700',
                          'medium': 'bg-yellow-100 text-yellow-700',
                          'low': 'bg-green-100 text-green-700'
                        }[request.urgency] || 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {request.urgency} priority
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {request.specialization}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {request.hospital}
                    </p>
                    
                    <div className="flex items-center space-x-1 mb-2">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <p className="text-xs text-gray-500">
                        Requested: {new Date(request.requestDate).toLocaleDateString()} at {new Date(request.requestDate).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-400 font-mono">
                      Address: {request.doctorAddress.slice(0, 20)}...
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {processingAction === request.doctorAddress ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                      <span className="text-blue-600 text-sm">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <button 
                        className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors min-w-[90px] justify-center"
                        onClick={() => handleApproveAccess(request.doctorAddress)}
                        disabled={processingAction !== null}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button 
                        className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors min-w-[90px] justify-center"
                        onClick={() => handleRejectAccess(request.doctorAddress)}
                        disabled={processingAction !== null}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending access requests</h3>
          <p className="text-gray-500">When doctors request access to your medical records, they will appear here.</p>
        </div>
      )}
    </div>
  );
};