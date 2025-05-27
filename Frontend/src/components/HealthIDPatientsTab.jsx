import React, { useState, useEffect } from 'react';
import { Search, Shield, User, Check, X, AlertCircle, FileText, Send } from 'lucide-react';
import { useMediChain } from '../context/BlockChainContext';
import axios from 'axios';

const HealthIDPatientsTab = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestStatus, setRequestStatus] = useState({});
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [patientReports, setPatientReports] = useState({});
  const [loadingReports, setLoadingReports] = useState({});
  const [requestingReport, setRequestingReport] = useState({});

  const {
    requestDoctorAccess,
    checkDoctorPermission,
    fetchPatientsWithHealthID,
    fetchMedicalReports
  } = useMediChain();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/patients", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const patientAddresses = res.data
          .filter(patient => patient.walletAddress)
          .map(patient => patient.walletAddress);

        const patientsWithHealthIDData = await fetchPatientsWithHealthID(patientAddresses);

        const enhancedPatients = await Promise.all(
          res.data
            .filter(patient => patient.walletAddress)
            .map(async (patient) => {
              const blockchainData = patientsWithHealthIDData.find(
                p => p.address.toLowerCase() === patient.walletAddress.toLowerCase()
              );

              if (blockchainData) {
                const hasPermission = await checkDoctorPermission(patient.walletAddress);
                setRequestStatus(prev => ({
                  ...prev,
                  [patient._id]: hasPermission ? 'approved' : 'none'
                }));

                return {
                  ...patient,
                  hasPermission,
                  healthIdToken: blockchainData.tokenId
                };
              }
              return null;
            })
        );

        setPatients(enhancedPatients.filter(Boolean));
      } catch (error) {
        console.error("Error fetching patients with HealthID:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPatients();
    }
  }, [token, fetchPatientsWithHealthID, checkDoctorPermission]);

  const handleRequestAccess = async (patient) => {
    if (!patient.walletAddress) {
      alert("Patient doesn't have a connected wallet address");
      return;
    }

    try {
      setRequestingAccess(true);
      setRequestStatus(prev => ({
        ...prev,
        [patient._id]: 'requesting'
      }));

      await requestDoctorAccess(patient.walletAddress);

      setRequestStatus(prev => ({
        ...prev,
        [patient._id]: 'pending'
      }));

      alert(`Access request sent to ${patient.name}`);
    } catch (error) {
      console.error("Error requesting access:", error);
      setRequestStatus(prev => ({
        ...prev,
        [patient._id]: 'error'
      }));
      alert(`Error requesting access: ${error.message}`);
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleRequestReport = async (patient) => {
    if (!patient.walletAddress) {
      alert("Patient doesn't have a connected wallet address");
      return;
    }

    setRequestingReport(prev => ({
      ...prev,
      [patient._id]: true
    }));

    try {
      await axios.post(
        "http://localhost:5000/api/auth/request-report",
        {
          patientId: patient._id,
          patientWalletAddress: patient.walletAddress,
          message: "Your doctor has requested a new medical report. Please upload it when available."
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert(`Report request sent to ${patient.name}`);
    } catch (error) {
      console.error(`Error requesting report from ${patient.name}:`, error);
      alert(`Error requesting report: ${error.message || 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setRequestingReport(prev => ({
          ...prev,
          [patient._id]: false
        }));
      }, 2000);
    }
  };

  const getRequestStatusUI = (patientId) => {
    const status = requestStatus[patientId];

    switch (status) {
      case 'requesting':
        return (
          <div className="flex items-center text-yellow-600 space-x-1">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-600 rounded-full border-t-transparent"></div>
            <span>Requesting...</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-blue-600 space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>Pending Approval</span>
          </div>
        );
      case 'approved':
        return (
          <div className="flex items-center text-green-600 space-x-1">
            <Check className="w-4 h-4" />
            <span>Access Granted</span>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center text-red-600 space-x-1">
            <X className="w-4 h-4" />
            <span>Access Denied</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600 space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <p className="text-center py-10 text-gray-600">Loading patients with HealthID...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Patients with HealthID</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="space-y-4">
            {filteredPatients.map((patient) => (
              <div key={patient._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{patient.name}</p>
                    <p className="text-sm text-gray-500">{patient.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {getRequestStatusUI(patient._id)}

                  <button
                    onClick={() => handleRequestAccess(patient)}
                    disabled={requestStatus[patient._id] === 'requesting'}
                    className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Request Access
                  </button>

                  <button
                    onClick={() => handleRequestReport(patient)}
                    disabled={requestingReport[patient._id]}
                    className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  >
                    <Send className="inline w-4 h-4 mr-1" />
                    Request Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No matching patients found.</p>
        )}
      </div>
    </div>
  );
};

export default HealthIDPatientsTab;
