import { Plus, X, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useMediChain } from '../context/BlockChainContext';
import { ethers } from 'ethers';
import guardianAbi from '../abis/GuardianAbi.json';
import medVaultAbi from '../abis/MedVaultAbi.json';

const GuardianManagement = ({ provider }) => {
  const { account } = useMediChain();
  
  // State for guardian management
  const [guardians, setGuardians] = useState([]);
  const [newGuardian, setNewGuardian] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for emergency unlock
  const [patientAddress, setPatientAddress] = useState('');
  const [isGuardianForPatient, setIsGuardianForPatient] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [emergencyActive, setEmergencyActive] = useState(false);

  // Contract instances state
  const [guardianContract, setGuardianContract] = useState(null);
  const [medVaultContract, setMedVaultContract] = useState(null);

  // Initialize contracts when provider is available
  useEffect(() => {
    if (!provider || !account) return;

    try {
      const signer = provider.getSigner();
      const guardian = new ethers.Contract(
        '0xb95d303Bdb067c3ba55791525b4F0465D3c27715',
        guardianAbi,
        signer
      );
      const medVault = new ethers.Contract(
        '0xB5DfAA0a512a9408Da7D940F63F80884901410b2',
        medVaultAbi,
        signer
      );

      setGuardianContract(guardian);
      setMedVaultContract(medVault);
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setError("Failed to initialize contracts. Please check your connection.");
    }
  }, [provider, account]);

  // Add a new guardian
  const addGuardian = () => {
    try {
      // Fix: Use ethers.getAddress or ethers.utils.isAddress
      if (!ethers.isAddress(newGuardian)) {
        setError('Invalid Ethereum address');
        return;
      }
      
      if (guardians.includes(newGuardian)) {
        setError('Guardian already added');
        return;
      }
      
      if (newGuardian.toLowerCase() === account.toLowerCase()) {
        setError('Cannot add yourself as guardian');
        return;
      }
      
      if (guardians.length >= 10) {
        setError('Maximum 10 guardians allowed');
        return;
      }
      
      setGuardians([...guardians, newGuardian]);
      setNewGuardian('');
      setError('');
    } catch (err) {
      setError('Invalid Ethereum address');
      console.error("Address validation error:", err);
    }
  };

  // Load current guardians and emergency status
  useEffect(() => {
    const loadData = async () => {
      if (!guardianContract || !medVaultContract || !account) return;
      
      try {
        setLoading(true);
        // Load assigned guardians
        const currentGuardians = await guardianContract.getGuardians(account);
        setGuardians(currentGuardians);
        
        // Check emergency status
        const active = await medVaultContract.emergencyAccessActive(account);
        setEmergencyActive(active);
      } catch (err) {
        console.error(err);
        setError("Failed to load guardian data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [account, guardianContract, medVaultContract]);



  // Assign guardians to contract
  const assignGuardians = async () => {
    if (!guardianContract || guardians.length < 2) {
      setError('Minimum 2 guardians required');
      return;
    }
    
    try {
      setLoading(true);
      const tx = await guardianContract.assignGuardians(guardians);
      await tx.wait();
      setError('');
      alert('Guardians assigned successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check guardian status for a patient
  const checkGuardianStatus = async () => {
    if (!guardianContract || !patientAddress) return;
    
    try {
      const guardians = await guardianContract.getGuardians(patientAddress);
      setIsGuardianForPatient(guardians.includes(account));
      
      const status = await guardianContract.getRequestStatus(patientAddress);
      setRequestStatus({
        approvalsNeeded: status.approvalsNeeded,
        currentApprovals: status.currentApprovals,
        unlockTime: new Date(status.unlockTime * 1000),
        executed: status.executed,
        active: status.active
      });
    } catch (err) {
      console.error(err);
      setError("Failed to check guardian status");
    }
  };

  // Request emergency unlock
  const requestUnlock = async () => {
    if (!guardianContract) return;
    
    try {
      setLoading(true);
      const tx = await guardianContract.requestUnlock(patientAddress);
      await tx.wait();
      await checkGuardianStatus();
    } catch (err) {
      console.error(err);
      setError("Failed to request unlock");
    } finally {
      setLoading(false);
    }
  };

  // Approve emergency unlock
  const approveUnlock = async () => {
    if (!guardianContract) return;
    
    try {
      setLoading(true);
      const tx = await guardianContract.approveUnlock(patientAddress);
      await tx.wait();
      await checkGuardianStatus();
    } catch (err) {
      console.error(err);
      setError("Failed to approve unlock");
    } finally {
      setLoading(false);
    }
  };

  // Revoke emergency access
  const revokeEmergencyAccess = async () => {
    if (!medVaultContract) return;
    
    try {
      setLoading(true);
      const tx = await medVaultContract.revokeEmergencyAccess();
      await tx.wait();
      setEmergencyActive(false);
      alert('Emergency access revoked!');
    } catch (err) {
      console.error(err);
      setError("Failed to revoke emergency access");
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Guardian Management</h2>
          <p className="text-gray-600">Please connect your wallet to manage guardians.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Guardian Management</h2>
      
      {/* Section 1: Manage Your Guardians */}
      <div className="bg-white/70 backdrop-blur-lg rounded-xl border border-white/20 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Your Guardians</h3>
        <p className="text-gray-600">Manage who can help unlock your medical records in emergencies</p>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={newGuardian}
            onChange={(e) => setNewGuardian(e.target.value)}
            placeholder="Enter guardian's wallet address"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
            disabled={loading}
          />
          <button 
            onClick={addGuardian}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add
          </button>
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="space-y-2">
          <h4 className="font-medium">Current Guardians ({guardians.length}/10)</h4>
          {guardians.length > 0 ? (
            <ul className="space-y-2">
              {guardians.map((guardian, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm">{guardian}</span>
                  <button 
                    onClick={() => setGuardians(guardians.filter(g => g !== guardian))}
                    disabled={loading}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No guardians assigned yet</p>
          )}
        </div>
        
        <button 
          onClick={assignGuardians}
          disabled={loading || guardians.length < 2}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
              Processing...
            </>
          ) : 'Save Guardians'}
        </button>
      </div>

      {/* Section 2: Emergency Unlock */}
      <div className="bg-white/70 backdrop-blur-lg rounded-xl border border-white/20 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Emergency Unlock</h3>
        <p className="text-gray-600">As a guardian, help unlock a patient's medical records in emergencies</p>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={patientAddress}
            onChange={(e) => setPatientAddress(e.target.value)}
            placeholder="Enter patient's wallet address"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
            disabled={loading}
          />
          <button 
            onClick={checkGuardianStatus}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            Check Status
          </button>
        </div>
        
        {isGuardianForPatient && (
          <div className="space-y-4">
            <h4 className="font-medium">Guardian Actions</h4>
            
            {!requestStatus?.active && !requestStatus?.executed && (
              <button 
                onClick={requestUnlock}
                disabled={loading}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : 'Initiate Emergency Unlock'}
              </button>
            )}
            
            {requestStatus?.active && !requestStatus.executed && (
              <div className="space-y-2">
                <div className="text-sm">
                  <p>Approvals: {requestStatus.currentApprovals}/{requestStatus.approvalsNeeded}</p>
                  <p>Time remaining: {Math.max(0, Math.floor((requestStatus.unlockTime - new Date()) / 3600000))} hours</p>
                </div>
                
                <button 
                  onClick={approveUnlock}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : 'Approve Unlock'}
                </button>
              </div>
            )}
            
            {requestStatus?.executed && (
              <p className="text-green-500 text-center py-2">Emergency access has been granted!</p>
            )}
          </div>
        )}
        
        {patientAddress && !isGuardianForPatient && (
          <p className="text-blue-500 text-center py-2">You are not a guardian for this patient</p>
        )}
      </div>
      
      {/* Section 3: Emergency Status */}
      {emergencyActive && (
        <div className="bg-white/70 backdrop-blur-lg rounded-xl border border-white/20 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-red-500">Emergency Access Active</h3>
          <p className="text-gray-600">Your medical records are currently accessible to your guardians</p>
          
          <button 
            onClick={revokeEmergencyAccess}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                Processing...
              </>
            ) : 'Revoke Emergency Access'}
          </button>
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

export default GuardianManagement;