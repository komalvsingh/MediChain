import React from "react";
import { 
  User, 
  Users, 
  Calendar,  
  Settings, 
  Shield,
  Activity,
  Stethoscope,
  UserCheck
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'patients', icon: Users, label: 'Patients' },
    { id: 'healthid-patients', icon: UserCheck, label: 'HealthID Patients' },
    { id: 'requests', icon: Shield, label: 'Access Requests' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-purple-50 to-pink-50 h-full border-r border-purple-100">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">MediChain AI</h1>
            <p className="text-sm text-gray-500">Doctor Portal</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-white shadow-md text-purple-600 border border-purple-100'
                  : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
