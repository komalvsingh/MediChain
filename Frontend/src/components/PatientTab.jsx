import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, MessageCircle, Clock, Bell, Circle, Heart, Activity } from 'lucide-react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';
import ChatModal from './ChatModal';

export const PatientsTab = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get token from your auth context/localStorage
  const token = localStorage.getItem('token'); // Adjust based on your auth implementation
  
  const {
    isConnected,
    messages,
    notifications,
    joinChat,
    sendMessage,
    markAsRead,
    sendTyping,
    clearNotifications
  } = useWebSocket(token);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/patients", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatients(res.data);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure only doctors can access this component
        if (res.data.usertype !== 'Doctor') {
          console.error("Access denied: Only doctors can view patients");
          // You might want to redirect or show an error message here
          return;
        }
        
        setCurrentUser(res.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback: try to get user info from token or localStorage
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const parsedUser = JSON.parse(userInfo);
          if (parsedUser.usertype === 'Doctor') {
            setCurrentUser(parsedUser);
          }
        }
      }
    };

    if (token) {
      fetchPatients();
      fetchCurrentUser();
    }
  }, [token]);

  // Update patient cards with notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setPatients(prev => prev.map(patient => {
        const patientNotifications = notifications.filter(n => n.senderId === patient._id);
        if (patientNotifications.length > 0) {
          const latestNotification = patientNotifications[patientNotifications.length - 1];
          return {
            ...patient,
            lastMessage: latestNotification.message,
            unreadCount: (patient.unreadCount || 0) + patientNotifications.length,
            lastMessageTime: new Date(latestNotification.timestamp)
          };
        }
        return patient;
      }));
    }
  }, [notifications]);

  const openChat = (patient) => {
    setSelectedPatient(patient);
    setIsChatOpen(true);
    joinChat(patient._id);
    
    // Clear unread count for this patient
    setPatients(prev => prev.map(pat => 
      pat._id === patient._id 
        ? { ...pat, unreadCount: 0 }
        : pat
    ));
    
    // Clear notifications for this patient
    const patientNotifications = notifications.filter(n => n.senderId === patient._id);
    if (patientNotifications.length > 0) {
      clearNotifications();
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedPatient(null);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.condition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort patients: those with unread messages first, then by last message time
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
    
    // Then sort by last message time
    const aTime = a.lastMessageTime || new Date(0);
    const bTime = b.lastMessageTime || new Date(0);
    return new Date(bTime) - new Date(aTime);
  });

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'stable': return 'text-green-600 bg-green-50 border-green-200';
      case 'improving': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'monitoring': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <p className="text-center py-10 text-gray-600">Loading patients...</p>;
  }

  // Check if user is authorized (Doctor only)
  if (currentUser && currentUser.usertype !== 'Doctor') {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">Access denied. Only doctors can view patients.</p>
      </div>
    );
  }

  // Don't render if user data is not loaded yet
  if (!currentUser) {
    return <p className="text-center py-10 text-gray-600">Loading user data...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-full w-fit ${
        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        <Circle className={`w-2 h-2 ${isConnected ? 'fill-green-500' : 'fill-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">My Patients</h2>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients, conditions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
            <Activity className="h-4 w-4 inline mr-2" />
            Health Overview
          </button>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPatients.map((patient) => (
          <div
            key={patient._id}
            className={`bg-white/70 backdrop-blur-lg rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-105 relative ${
              (patient.unreadCount || 0) > 0 
                ? 'border-blue-200 shadow-lg ring-2 ring-blue-100' 
                : 'border-white/20'
            }`}
          >
            {/* Notification Badge */}
            {(patient.unreadCount || 0) > 0 && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {patient.unreadCount}
              </div>
            )}

            <div className="p-6">
              {/* Patient Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {patient.avatar ? (
                      <img 
                        src={patient.avatar} 
                        alt={patient.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full flex items-center justify-center text-white font-bold">
                        {patient.name?.charAt(0) || '👤'}
                      </div>
                    )}
                    <Circle 
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full fill-green-400 text-green-400"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-blue-600">{patient.email}</p>
                    {patient.age && (
                      <p className="text-xs text-gray-500">Age: {patient.age}</p>
                    )}
                  </div>
                </div>
                {patient.healthScore && (
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 text-red-400" />
                      <span className={`text-sm font-bold ${getHealthScoreColor(patient.healthScore)}`}>
                        {patient.healthScore}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Last Message Preview */}
              {patient.lastMessage && (
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-3 mb-4 border border-blue-100">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">Last message:</span> {patient.lastMessage}
                  </p>
                </div>
              )}

              {/* Patient Details */}
              <div className="space-y-2 mb-4">
                {patient.condition && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Condition:</span>
                    <span className="font-medium">{patient.condition}</span>
                  </div>
                )}
                {patient.lastVisit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Visit:</span>
                    <span className="font-medium">{new Date(patient.lastVisit).toLocaleDateString()}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Status */}
              {patient.status && (
                <div className={`border rounded-lg p-3 mb-4 ${getStatusColor(patient.status)}`}>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-medium capitalize">
                      Status: {patient.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Next Appointment */}
              {patient.nextAppointment && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      Next appointment: {new Date(patient.nextAppointment).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all text-sm">
                  View Records
                </button>
                <button 
                  onClick={() => openChat(patient)}
                  className={`px-3 py-2 rounded-lg transition-all relative ${
                    (patient.unreadCount || 0) > 0
                      ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white animate-pulse'
                      : 'border border-blue-300 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  {(patient.unreadCount || 0) > 0 && (
                    <Bell className="absolute -top-1 -right-1 h-3 w-3 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedPatients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'No patients assigned to you yet.'}
          </p>
        </div>
      )}

      {/* Chat Modal */}
       {isChatOpen && selectedPatient && currentUser && (
        <ChatModal
          doctor={{
            _id: selectedPatient._id,
            name: selectedPatient.name,
            specialization: selectedPatient.condition || 'Patient', // Using condition as specialization for patients
            image: selectedPatient.avatar || '👤', // Use patient avatar or default
            ...selectedPatient // spread other properties if needed
          }}
          isOpen={isChatOpen}
          onClose={closeChat}
          messages={messages}
          onSendMessage={sendMessage}
          onTyping={sendTyping}
          isConnected={isConnected}
          currentUser={{ 
            _id: currentUser._id, // Changed from 'id' to '_id' to match ChatModal expectations
            usertype: currentUser.usertype
          }}
        />
      )}
    </div>
  );
};

export default PatientsTab;