import { Plus } from 'lucide-react';
import React from 'react';
const HealthRecordsTab = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Health Records</h2>
        <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus className="h-4 w-4 inline mr-2" />
          Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { type: 'Lab Results', date: 'May 20, 2025', status: 'Normal', color: 'green' },
          { type: 'X-Ray Chest', date: 'May 15, 2025', status: 'Clear', color: 'green' },
          { type: 'Blood Test', date: 'May 10, 2025', status: 'Attention Needed', color: 'yellow' },
          { type: 'ECG Report', date: 'May 5, 2025', status: 'Normal', color: 'green' }
        ].map((record, index) => (
          <div key={index} className="bg-white/70 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{record.type}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                record.color === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {record.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{record.date}</p>
            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              View Details →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthRecordsTab;