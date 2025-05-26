import React from 'react';

const EmergencyBanner = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-2 text-center text-sm">
      🚨 Emergency? Call 911 immediately or use the emergency button in the app
    </div>
  );
};

export default EmergencyBanner;