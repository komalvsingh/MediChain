import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import NavigationTabs from '../components/NavigationTabs';
import DashboardTab from '../components/DashboardTab';
import SymptomChecker from '../components/symptomscheck';
import MedicalReportAnalyzer from '../components/MedicalReportAnalyzer';
import DoctorsTab from '../components/DoctorsTab';
import HealthRecordsTab from '../components/HealthRecordsTab';
import ZKPVerificationTab from '../components/ZKPVerificationTab';
import { AccessRequestsPanel } from '../components/AccessRequest';
import GuardianManagement from '../components/GuardianManagement';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wearableData, setWearableData] = useState({
    heartRate: 72,
    bloodPressure: '120/80',
    bloodOxygen: 98,
    temperature: 98.6,
    steps: 7500,
    sleep: 7.5,
    calories: 1800
  });

  // Simulate wearable data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWearableData(prev => ({
        ...prev,
        heartRate: Math.floor(Math.random() * 10) + 65,
        bloodOxygen: Math.floor(Math.random() * 3) + 96,
        steps: prev.steps + Math.floor(Math.random() * 100),
        calories: prev.calories + Math.floor(Math.random() * 50)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab wearableData={wearableData} />;
      case 'symptom-checker':
        return <SymptomChecker />;
      case 'disease-detection':
        return <MedicalReportAnalyzer />;
      case 'doctors':
        return <DoctorsTab />;
      case 'health-records':
        return <HealthRecordsTab />;
      case 'access-requests':
        return <AccessRequestsPanel />;
      case 'zkp-verification':
        return <ZKPVerificationTab />;
      case 'guardian-management':
        return <GuardianManagement />;
      default:
        return <DashboardTab wearableData={wearableData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderContent()}
      </div>
    </div>
  );
};

export default PatientDashboard;