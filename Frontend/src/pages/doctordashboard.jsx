import React, { useState, useEffect } from 'react';
import {  
  Users, 
  Calendar, 
  Plus,
  Eye,
  Download,
  Shield,
  Activity,
  Clock,
  Brain,
} from 'lucide-react';
import { AccessRequestsPanel } from '../components/AccessRequest';
import { ProfileForm } from '../components/ProfileForm';
import { Sidebar } from '../components/Sidebar';
import Header from '../components/DocHeader';
import PatientsTab from '../components/PatientTab';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const StatsCards = () => {
  const stats = [
    { 
      title: 'Total Patients', 
      value: '1,247', 
      change: '+12%', 
      icon: Users, 
      color: 'from-blue-400 to-cyan-400',
      bgColor: 'from-blue-50 to-cyan-50'
    },
    { 
      title: 'Today\'s Appointments', 
      value: '18', 
      change: '+3', 
      icon: Calendar, 
      color: 'from-green-400 to-emerald-400',
      bgColor: 'from-green-50 to-emerald-50'
    },
    { 
      title: 'Pending Requests', 
      value: '7', 
      change: '+2', 
      icon: Shield, 
      color: 'from-orange-400 to-red-400',
      bgColor: 'from-orange-50 to-red-50'
    },
    { 
      title: 'AI Diagnoses', 
      value: '156', 
      change: '+24%', 
      icon: Brain, 
      color: 'from-purple-400 to-pink-400',
      bgColor: 'from-purple-50 to-pink-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className={`bg-gradient-to-r ${stat.bgColor} p-6 rounded-xl border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
            </div>
            <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};



const AppointmentsPanel = () => {
  const todayAppointments = [
    { id: 1, time: '09:00 AM', patient: 'Sarah Johnson', type: 'Follow-up', status: 'confirmed' },
    { id: 2, time: '10:30 AM', patient: 'Mike Davis', type: 'Consultation', status: 'pending' },
    { id: 3, time: '02:00 PM', patient: 'Lisa Wong', type: 'Check-up', status: 'confirmed' },
    { id: 4, time: '03:30 PM', patient: 'Robert Miller', type: 'Emergency', status: 'urgent' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Appointments</h3>
        <div className="space-y-4">
          {todayAppointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{appointment.patient}</h4>
                  <p className="text-sm text-gray-600">{appointment.type}</p>
                  <p className="text-xs text-gray-500">{appointment.time}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {appointment.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const OverviewPanel = () => {
  return (
    <div className="space-y-6">
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PatientsTab />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 text-left bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg border border-blue-100 transition-all">
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Add New Patient</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border border-green-100 transition-all">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Schedule Appointment</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border border-purple-100 transition-all">
                <Brain className="w-5 h-5 text-purple-600" />
                <Link to="/prescription"><span className="font-medium text-purple-800">Prescription Generator</span></Link>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Critical Cases</span>
                <span className="text-lg font-bold text-red-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Improving Cases</span>
                <span className="text-lg font-bold text-green-600">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stable Cases</span>
                <span className="text-lg font-bold text-blue-600">28</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPanel />;
      case 'patients':
        return <PatientsTab />;
      case 'requests':
        return <AccessRequestsPanel />;
      case 'appointments':
        return <AppointmentsPanel />;
      case 'profile':
        return <ProfileForm />;
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <OverviewPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar/>
          <div className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;