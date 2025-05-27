import React from "react";
import { 
  CheckCircle,
  XCircle,
 
} from 'lucide-react';
const mockAccessRequests = [
  {
    id: 1,
    patientName: "Emma Wilson",
    requestedBy: "Dr. Sarah Chen",
    requestDate: "2024-01-20",
    urgency: "high",
    reason: "Emergency cardiac evaluation"
  },
  {
    id: 2,
    patientName: "James Brown",
    requestedBy: "Dr. Michael Taylor",
    requestDate: "2024-01-19",
    urgency: "medium",
    reason: "Routine follow-up"
  }
];

export const AccessRequestsPanel = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Access Requests</h3>
        <div className="space-y-4">
          {mockAccessRequests.map((request) => (
            <div key={request.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Patient: {request.patientName}</h4>
                  <p className="text-sm text-gray-600">Requested by: {request.requestedBy}</p>
                  <p className="text-xs text-gray-500">Date: {request.requestDate}</p>
                  <p className="text-sm text-gray-700 mt-2">Reason: {request.reason}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.urgency === 'high' ? 'bg-red-100 text-red-700' :
                    request.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {request.urgency} priority
                  </span>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

