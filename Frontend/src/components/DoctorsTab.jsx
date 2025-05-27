import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, MessageCircle, Clock, Bell, Circle } from 'lucide-react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';
import ChatModal from './ChatModal';

const DoctorsTab = () => {
  const [doctors, setDoctors] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
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
    const fetchDoctors = async () => {
      try {
        // Fetch doctor users from auth/doctors endpoint
        const doctorUsersRes = await axios.get("http://localhost:5000/api/auth/doctors", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDoctorUsers(doctorUsersRes.data);

        // Fetch doctor details from doctors endpoint
        const doctorDetailsRes = await axios.get("http://localhost:5000/api/doctors", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Merge doctor users with their details
        const mergedDoctors = doctorUsersRes.data.map(doctorUser => {
          const doctorDetails = doctorDetailsRes.data.find(doc => 
            doc.userId === doctorUser._id || doc.email === doctorUser.email
          );
          
          return {
            ...doctorUser, // User data for chat (includes _id, name, email, usertype)
            // Doctor details for display
            specialization: doctorDetails?.specialization || 'General Practice',
            experience: doctorDetails?.experience || 'N/A',
            location: doctorDetails?.location || 'Not specified',
            fee: doctorDetails?.fee || 'Contact for pricing',
            rating: doctorDetails?.rating || '4.5',
            nextAvailable: doctorDetails?.nextAvailable || 'Contact to schedule',
            image: doctorDetails?.image || doctorUser.avatar || '👨‍⚕️',
            // Keep original doctor details if needed
            doctorDetails: doctorDetails
          };
        });

        setDoctors(mergedDoctors);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure only patients can access this component
        if (res.data.usertype !== 'Patient') {
          console.error("Access denied: Only patients can view doctors");
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
          if (parsedUser.usertype === 'Patient') {
            setCurrentUser(parsedUser);
          }
        }
      }
    };

    if (token) {
      fetchDoctors();
      fetchCurrentUser();
    }
  }, [token]);

  // Update doctor cards with notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setDoctors(prev => prev.map(doctor => {
        const doctorNotifications = notifications.filter(n => n.senderId === doctor._id);
        if (doctorNotifications.length > 0) {
          const latestNotification = doctorNotifications[doctorNotifications.length - 1];
          return {
            ...doctor,
            lastMessage: latestNotification.message,
            unreadCount: (doctor.unreadCount || 0) + doctorNotifications.length,
            lastMessageTime: new Date(latestNotification.timestamp)
          };
        }
        return doctor;
      }));
    }
  }, [notifications]);

  const openChat = (doctor) => {
    setSelectedDoctor(doctor);
    setIsChatOpen(true);
    joinChat(doctor._id); // Using user _id for chat
    
    // Clear unread count for this doctor
    setDoctors(prev => prev.map(doc => 
      doc._id === doctor._id 
        ? { ...doc, unreadCount: 0 }
        : doc
    ));
    
    // Clear notifications for this doctor
    const doctorNotifications = notifications.filter(n => n.senderId === doctor._id);
    if (doctorNotifications.length > 0) {
      clearNotifications();
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedDoctor(null);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort doctors: those with unread messages first
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
    
    // Then sort by last message time
    const aTime = a.lastMessageTime || new Date(0);
    const bTime = b.lastMessageTime || new Date(0);
    return new Date(bTime) - new Date(aTime);
  });

  if (loading) {
    return <p className="text-center py-10 text-gray-600">Loading doctors...</p>;
  }

  // Check if user is authorized (Patient only)
  if (currentUser && currentUser.usertype !== 'Patient') {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">Access denied. Only patients can view doctors.</p>
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
        <h2 className="text-2xl font-bold text-gray-800">Find Doctors</h2>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search doctors, specializations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all">
            <MapPin className="h-4 w-4 inline mr-2" />
            Near Me
          </button>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedDoctors.map((doctor) => (
          <div
            key={doctor._id}
            className={`bg-white/70 backdrop-blur-lg rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-105 relative ${
              (doctor.unreadCount || 0) > 0 
                ? 'border-pink-200 shadow-lg ring-2 ring-pink-100' 
                : 'border-white/20'
            }`}
          >
            {/* Notification Badge */}
            {(doctor.unreadCount || 0) > 0 && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {doctor.unreadCount}
              </div>
            )}

            <div className="p-6">
              {/* Doctor Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {doctor.avatar || doctor.image ? (
                      <img 
                        src={doctor.avatar || doctor.image} 
                        alt={doctor.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl">{doctor.image || '👨‍⚕️'}</div>
                    )}
                    <Circle 
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full fill-green-400 text-green-400"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{doctor.name}</h3>
                    <p className="text-sm text-purple-600">{doctor.specialization}</p>
                    <p className="text-xs text-gray-500">{doctor.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{doctor.rating}</span>
                </div>
              </div>

              {/* Last Message Preview */}
              {doctor.lastMessage && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4 border border-purple-100">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">Last message:</span> {doctor.lastMessage}
                  </p>
                </div>
              )}

              {/* Doctor Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Experience:</span>
                  <span className="font-medium">{doctor.experience} years</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{doctor.location}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fee:</span>
                  <span className="font-medium text-green-600">${doctor.fee}</span>
                </div>
              </div>

              {/* Availability */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Next available: {doctor.nextAvailable}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm">
                  Book Appointment
                </button>
                <button 
                  onClick={() => openChat(doctor)}
                  className={`px-3 py-2 rounded-lg transition-all relative ${
                    (doctor.unreadCount || 0) > 0
                      ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white animate-pulse'
                      : 'border border-purple-300 text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  {(doctor.unreadCount || 0) > 0 && (
                    <Bell className="absolute -top-1 -right-1 h-3 w-3 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedDoctors.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'No doctors available at the moment.'}
          </p>
        </div>
      )}

      {/* Chat Modal */}
      {isChatOpen && selectedDoctor && currentUser && (
        <ChatModal
          doctor={{
            _id: selectedDoctor._id, // User ID for chat
            name: selectedDoctor.name,
            specialization: selectedDoctor.specialization,
            image: selectedDoctor.avatar || selectedDoctor.image || '👨‍⚕️',
            email: selectedDoctor.email,
            usertype: selectedDoctor.usertype, // Should be 'Doctor'
            ...selectedDoctor // spread other properties if needed
          }}
          isOpen={isChatOpen}
          onClose={closeChat}
          messages={messages}
          onSendMessage={sendMessage}
          onTyping={sendTyping}
          isConnected={isConnected}
          currentUser={{ 
            _id: currentUser._id, // User ID for chat
            usertype: currentUser.usertype, // Should be 'Patient'
            name: currentUser.name,
            email: currentUser.email
          }}
        />
      )}
    </div>
  );
};

export default DoctorsTab;