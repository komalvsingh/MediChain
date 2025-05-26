// src/context/MediChainContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { ethers } from "ethers";
import HealthIDAbi from "../abis/HealthIdAbi.json";
import MedVaultAbi from "../abis/MedVaultAbi.json";
import GuardianAbi from "../abis/GuardianAbi.json";

// Updated contract addresses - CHANGE THE MEDVAULT ADDRESS AFTER REDEPLOYMENT
const CONTRACT_ADDRESSES = {
  healthID: "0x0926920E743431343D90edA86F1B276350DA5A89",
  medVault: "0xD51BEd74dBAf5A3A114bc4973E23676a878A4DAD", // ⚠️ UPDATE THIS AFTER REDEPLOY
  guardian: "0xf2f2612cFE7120cf6E8a99fe49A53220A5af8D6E"
};

// Create the context
const MediChainContext = createContext();

// Provider component
export const MediChainProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [healthID, setHealthID] = useState(null);
  const [medVault, setMedVault] = useState(null);
  const [guardian, setGuardian] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userHealthID, setUserHealthID] = useState(null);
  const [medicalReports, setMedicalReports] = useState([]);
  const [doctorAccess, setDoctorAccess] = useState({});

  // Connect wallet and initialize contracts
  const connectWallet = async () => {
    if (!window.ethereum) {
      console.error("MetaMask not found");
      return;
    }
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      setProvider(_provider);

      const accounts = await _provider.send("eth_accounts", []);
      setAccount(accounts[0]);

      const signer = await _provider.getSigner();
      
      // Initialize all contracts
      const _healthID = new ethers.Contract(
        CONTRACT_ADDRESSES.healthID, 
        HealthIDAbi, 
        signer
      );
      setHealthID(_healthID);

      const _medVault = new ethers.Contract(
        CONTRACT_ADDRESSES.medVault,
        MedVaultAbi,
        signer
      );
      setMedVault(_medVault);

      const _guardian = new ethers.Contract(
        CONTRACT_ADDRESSES.guardian,
        GuardianAbi,
        signer
      );
      setGuardian(_guardian);

      // Check if user has HealthID
      await checkHealthID(_healthID, accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  // Check if user has HealthID
  const checkHealthID = async (contract, address) => {
    try {
      const balance = await contract.balanceOf(address);
      if (balance > 0) {
        const tokenId = await contract.addressToTokenId(address);
        setUserHealthID(tokenId.toString());
      }
    } catch (error) {
      console.error("Error checking HealthID:", error);
    }
  };

  // Mint HealthID (onlyOwner)
  const mintHealthID = async (userAddress) => {
    if (!healthID) return;
    try {
      setLoading(true);
      const tx = await healthID.mintHealthID(userAddress);
      await tx.wait();
      await checkHealthID(healthID, userAddress);
      setLoading(false);
    } catch (error) {
      console.error("Error minting HealthID:", error);
      setLoading(false);
    }
  };

  // 🔧 UPDATED: Upload medical report with string IPFS hash
  const uploadReport = async (ipfsHash) => {
    if (!medVault) return;
    try {
      setLoading(true);
      // Now accepts string directly (no bytes32 conversion)
      const tx = await medVault.uploadReport(ipfsHash);
      await tx.wait();
      setLoading(false);
      await fetchMedicalReports();
      return tx.hash;
    } catch (error) {
      console.error("Error uploading report:", error);
      setLoading(false);
      throw error;
    }
  };

  // 🔧 UPDATED: Fetch user's medical reports using new getReports function
  const fetchMedicalReports = async (targetAddress = null) => {
    if (!medVault || !account) return;
    try {
      const addressToQuery = targetAddress || account;
      // Use the new getReports function that returns string[] 
      const reports = await medVault.getReports(addressToQuery);
      setMedicalReports(reports);
      return reports;
    } catch (error) {
      console.error("Error fetching reports:", error);
      setMedicalReports([]);
      return [];
    }
  };

  // 🔧 NEW: Get report count
  const getReportCount = async (targetAddress = null) => {
    if (!medVault || !account) return 0;
    try {
      const addressToQuery = targetAddress || account;
      const count = await medVault.getReportCount(addressToQuery);
      return count.toNumber();
    } catch (error) {
      console.error("Error getting report count:", error);
      return 0;
    }
  };

  // 🔧 NEW: Get specific report by index
  const getReportByIndex = async (targetAddress, index) => {
    if (!medVault || !account) return null;
    try {
      const report = await medVault.getReportByIndex(targetAddress, index);
      return report;
    } catch (error) {
      console.error("Error getting report by index:", error);
      return null;
    }
  };

  // Request doctor access
  const requestDoctorAccess = async (patientAddress) => {
    if (!medVault) return;
    try {
      setLoading(true);
      const tx = await medVault.requestAccess(patientAddress);
      await tx.wait();
      setLoading(false);
      return tx.hash;
    } catch (error) {
      console.error("Error requesting access:", error);
      setLoading(false);
      throw error;
    }
  };

  // Approve/deny doctor access
  const manageDoctorAccess = async (doctorAddress, grant) => {
    if (!medVault) return;
    try {
      setLoading(true);
      const tx = await medVault.approveAccess(doctorAddress, grant);
      await tx.wait();
      setLoading(false);
      await fetchDoctorAccess();
      return tx.hash;
    } catch (error) {
      console.error("Error managing doctor access:", error);
      setLoading(false);
      throw error;
    }
  };

  // 🔧 UPDATED: Check doctor permissions using public mapping
  const checkDoctorPermission = async (patientAddress, doctorAddress) => {
    if (!medVault) return false;
    try {
      // Use the public doctorPermissions mapping
      const hasPermission = await medVault.doctorPermissions(patientAddress, doctorAddress);
      return hasPermission;
    } catch (error) {
      console.error("Error checking doctor permission:", error);
      return false;
    }
  };

  // 🔧 NEW: Fetch all doctor permissions for current user
  const fetchDoctorAccess = async () => {
    if (!medVault || !account) return;
    try {
      // Note: Since we can't easily enumerate all doctors from the contract,
      // this would typically be done by listening to events or maintaining
      // a list of doctors that have requested access
      
      // For now, we'll store doctor addresses that we want to check
      // In a real app, you'd get this from events or a separate tracking system
      const permissions = {};
      setDoctorAccess(permissions);
      return permissions;
    } catch (error) {
      console.error("Error fetching doctor access:", error);
      setDoctorAccess({});
      return {};
    }
  };

  // Guardian functions (unchanged)
  const requestUnlock = async (patientAddress, guardians) => {
    if (!guardian) return;
    try {
      setLoading(true);
      const tx = await guardian.requestUnlock(patientAddress, guardians);
      await tx.wait();
      setLoading(false);
      return tx.hash;
    } catch (error) {
      console.error("Error requesting unlock:", error);
      setLoading(false);
      throw error;
    }
  };

  const approveUnlock = async (patientAddress) => {
    if (!guardian) return;
    try {
      setLoading(true);
      const tx = await guardian.approveUnlock(patientAddress);
      await tx.wait();
      setLoading(false);
      return tx.hash;
    } catch (error) {
      console.error("Error approving unlock:", error);
      setLoading(false);
      throw error;
    }
  };

  // 🔧 NEW: Listen to contract events
  const listenToEvents = () => {
    if (!medVault) return;
    
    // Listen for report uploads
    medVault.on("ReportUploaded", (user, ipfsHash, event) => {
      console.log("Report uploaded:", { user, ipfsHash });
      if (user.toLowerCase() === account?.toLowerCase()) {
        fetchMedicalReports();
      }
    });

    // Listen for access requests
    medVault.on("AccessRequested", (doctor, patient, event) => {
      console.log("Access requested:", { doctor, patient });
      if (patient.toLowerCase() === account?.toLowerCase()) {
        // Notify user of access request
        console.log(`Doctor ${doctor} requested access to your records`);
      }
    });

    // Listen for access approvals
    medVault.on("AccessApproved", (doctor, patient, granted, event) => {
      console.log("Access approved:", { doctor, patient, granted });
      fetchDoctorAccess();
    });
  };

  // Initialize when provider changes
  useEffect(() => {
    if (provider && account && medVault) {
      fetchMedicalReports();
      fetchDoctorAccess();
      listenToEvents();

      // Cleanup listeners on unmount
      return () => {
        if (medVault) {
          medVault.removeAllListeners();
        }
      };
    }
  }, [provider, account, medVault]);

  return (
    <MediChainContext.Provider
      value={{
        // State
        account,
        provider,
        healthID,
        medVault,
        guardian,
        loading,
        userHealthID,
        medicalReports,
        doctorAccess,
        
        // Basic functions
        connectWallet,
        mintHealthID,
        
        // Report functions
        uploadReport,
        fetchMedicalReports,
        getReportCount,
        getReportByIndex,
        
        // Access control functions
        requestDoctorAccess,
        manageDoctorAccess,
        checkDoctorPermission,
        fetchDoctorAccess,
        
        // Guardian functions
        requestUnlock,
        approveUnlock
      }}
    >
      {children}
    </MediChainContext.Provider>
  );
};

// Custom hook
export const useMediChain = () => useContext(MediChainContext);