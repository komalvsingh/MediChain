import React, { useState, useEffect } from 'react';
import NavigationTabs from '../components/NavigationTabs';
import DashboardTab from '../components/DashboardTab';
import DoctorsTab from '../components/DoctorsTab';
import HealthRecordsTab from '../components/HealthRecordsTab';
import ZKPVerificationTab from '../components/ZKPVerificationTab';
import FloatingActionButton from '../components/FloatingActionButton';
import EmergencyBanner from '../components/EmergencyBanner';
import Navbar from '../components/Navbar';
import SymptomChecker from '../components/symptomscheck';
import MedicalReportAnalyzer from '../components/MedicalReportAnalyzer';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wearableData, setWearableData] = useState({
    heartRate: 72,
    oxygenLevel: 98,
    bloodPressure: '120/80',
    steps: 8547,
    calories: 2150
  });

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWearableData(prev => ({
        ...prev,
        heartRate: 68 + Math.floor(Math.random() * 20),
        oxygenLevel: 96 + Math.floor(Math.random() * 3),
        steps: prev.steps + Math.floor(Math.random() * 10)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navbar/>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'dashboard' && <DashboardTab wearableData={wearableData} />}
        {activeTab === 'symptom-checker' && <SymptomChecker/>}
        {activeTab === 'disease-detection' && <MedicalReportAnalyzer />}
        {activeTab === 'doctors' && <DoctorsTab />}
        {activeTab === 'health-records' && <HealthRecordsTab />}
        {activeTab === 'zkp-verification' && <ZKPVerificationTab />}
      </div>

      <FloatingActionButton />
      <EmergencyBanner />
    </div>
  );
};

export default PatientDashboard;