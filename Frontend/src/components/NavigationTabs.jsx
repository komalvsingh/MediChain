import { 
  Activity, 
  MessageCircle, 
  Upload, 
  Stethoscope, 
  FileText, 
  Shield 
} from 'lucide-react';
import React from 'react';
const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'symptom-checker', label: 'AI Symptom Checker', icon: MessageCircle },
    { id: 'disease-detection', label: 'Disease Detection', icon: Upload },
    { id: 'doctors', label: 'Find Doctors', icon: Stethoscope },
    { id: 'health-records', label: 'Health Records', icon: FileText },
    { id: 'zkp-verification', label: 'ZKP Verification', icon: Shield }
  ];

  return (
    <div className="flex space-x-1 bg-white/50 backdrop-blur-lg p-1 rounded-xl mb-6 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NavigationTabs;