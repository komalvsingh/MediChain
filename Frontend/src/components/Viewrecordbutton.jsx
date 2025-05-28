import React from 'react';
import { Link } from 'react-router-dom';

export const ViewRecordsButton = ({ patient, className = "" }) => {
  return (
    <Link 
      to="/patient-records" 
      state={{ patient }}
      className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all text-sm text-center inline-block ${className}`}
    >
      View Records
    </Link>
  );
};

export default ViewRecordsButton;