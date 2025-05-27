import React, { useState, useEffect } from "react";
import { 
  CheckCircle,
  XCircle,
  Shield,
  User,
  AlertCircle,
  Clock,
  Calendar,
  Mail,
  Phone,
  FileText
} from 'lucide-react';
import { useMediChain } from '../context/BlockChainContext';
import axios from 'axios';

export const AccessRequestsPanel = () => {
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  
  const { manageDoctorAccess, medVault, account } = useMediChain();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchAccessRequests = async () => {
      if (!medVault || !account) return;
      
      try {
        setLoading(true);
        
        // Listen for AccessRequested events
        const filter = medVault.filters.AccessRequested(null, account);
        const events = await medVault.queryFilter(filter);
        
        // Get unique doctor addresses from events
        const doctorAddresses = [...new Set(events.map(event => event.args[0]))]; 
        
        // Fetch doctor details from backend
        const doctorRequests = [];
        const historyItems = [];
        
        for (const doctorAddress of doctorAddresses) {
          try {
            // Check if access is already granted
            const hasAccess = await medVault.doctorPermissions(account, doctorAddress);
            
            // Fetch doctor info from backend using wallet address
            const response = await axios.get(`http://localhost:5000/api/doctors/wallet/${doctorAddress}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const doctorInfo = response.data || {
              name: 'Unknown Doctor',
              specialization: 'Not specified',
              email: 'Not available',
              phone: 'Not available'
            };
            
            const requestItem = {
              id: doctorAddress,
              doctorName: doctorInfo.name,
              doctorAddress: doctorAddress,
              requestDate: new Date().toISOString(),
              urgency: doctorInfo.urgency || 'medium',
              reason: 'Medical record access',
              specialization: doctorInfo.specialization,
              email: doctorInfo.email,
              phone: doctorInfo.phone,
              hospital: doctorInfo.hospital || 'Not specified',
              profilePicture: doctorInfo.profilePicture
            };
            
            if (hasAccess) {
              // Add to history if already approved
              historyItems.push({
                ...requestItem,
                status: 'approved',
                actionDate: new Date().toISOString()
              });
            } else {
              // Add to pending requests
              doctorRequests.push(requestItem);
            }
          } catch (error) {
            console.error(`Error fetching doctor info for ${doctorAddress}:`, error);
            // Add with minimal info if we can't fetch details
            doctorRequests.push({
              id: doctorAddress,
              doctorName: 'Doctor',
              doctorAddress: doctorAddress,
              requestDate: new Date().toISOString(),
              urgency: 'medium',
              reason: 'Medical record access'
            });
          }
        }
        
        setAccessRequests(doctorRequests);
        setRequestHistory(historyItems);
      } catch (error) {
        console.error("Error fetching access requests:", error);
      } finally {
        setLoading(false);
      }
    };

    if (medVault && account) {
      fetchAccessRequests();
      
      // Set up event listener for new requests
      const handleAccessRequested = (doctor, patient) => {
        if (patient.toLowerCase() === account.toLowerCase()) {
          fetchAccessRequests();
        }
      };
      
      // Set up event listener for access approval/rejection
      const handleAccessApproved = (doctor, patient, approved) => {
        if (patient.toLowerCase() === account.toLowerCase()) {
          fetchAccessRequests();
        }
      };
      
      medVault.on("AccessRequested", handleAccessRequested);
      medVault.on("AccessApproved", handleAccessApproved);
      
      return () => {
        medVault.off("AccessRequested", handleAccessRequested);
        medVault.off("AccessApproved", handleAccessApproved);
      };
    }
  }, [medVault, account, token]);

  const handleApproveAccess = async (doctorAddress) => {
    try {
      setProcessingAction(doctorAddress);
      await manageDoctorAccess(doctorAddress, true);
      
      // Find the request to move to history
      const approvedRequest = accessRequests.find(req => req.doctorAddress === doctorAddress);
      
      if (approvedRequest) {
        // Add to history
        setRequestHistory(prev => [
          ...prev,
          {
            ...approvedRequest,
            status: 'approved',
            actionDate: new Date().toISOString()
          }
        ]);
      }
      
      // Remove from pending list
      setAccessRequests(prev => prev.filter(req => req.doctorAddress !== doctorAddress));
      
      alert("Access approved successfully");
    } catch (error) {
      console.error("Error approving access:", error);
      alert(`Error approving access: ${error.message}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectAccess = async (doctorAddress) => {
    try {
      setProcessingAction(doctorAddress);
      await manageDoctorAccess(doctorAddress, false);
      
      // Find the request to move to history
      const rejectedRequest = accessRequests.find(req => req.doctorAddress === doctorAddress);
      
      if (rejectedRequest) {
        // Add to history
        setRequestHistory(prev => [
          ...prev,
          {
            ...rejectedRequest,
            status: 'rejected',
            actionDate: new Date().toISOString()
          }
        ]);
      }
      
      // Remove from pending list
      setAccessRequests(prev => prev.filter(req => req.doctorAddress !== doctorAddress));
      
      alert("Access rejected successfully");
    } catch (error) {
      console.error("Error rejecting access:", error);
      alert(`Error rejecting access: ${error.message}`);
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
        
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
                    
                    <div>
                      <div className="flex items-center space-x-2">
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
                      
                      {request.specialization && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          Specialization: {request.specialization}
                        </p>
                      )}
                      
                      {request.hospital && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Hospital: {request.hospital}
                        </p>
                      )}
                      
                      {request.email && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {request.email}
                        </p>
                      )}
                      
                      {request.phone && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {request.phone}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <p className="text-xs text-gray-500">Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                      </div>
                      
                      <p className="text-sm text-gray-700 mt-2">Reason: {request.reason}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {processingAction === request.doctorAddress ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                        <span className="text-blue-600 text-sm">Processing...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <button 
                          className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          onClick={() => handleApproveAccess(request.doctorAddress)}
                          disabled={processingAction !== null}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button 
                          className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
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
      
      {/* Request History Section */}
      {requestHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Access Request History</h3>
          
          <div className="space-y-4">
            {requestHistory.map((request) => (
              <div key={`history-${request.id}`} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-gray-100 to-blue-100 flex items-center justify-center">
                        {request.profilePicture ? (
                          <img src={request.profilePicture} alt={request.doctorName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-800">{request.doctorName}</h4>
                      {request.specialization && (
                        <p className="text-xs text-gray-600">Specialization: {request.specialization}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <p className="text-xs text-gray-500">{new Date(request.actionDate).toLocaleDateString()}</p>
                    </div>
                    
                    {request.status === 'approved' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

