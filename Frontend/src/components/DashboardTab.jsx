import { 
  Heart, 
  Activity, 
  TrendingUp, 
  MessageCircle, 
  Upload, 
  Stethoscope, 
  Calendar 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React from 'react';
const DashboardTab = ({ wearableData }) => {
  // Mock data for charts
  const healthData = [
    { time: '6AM', heartRate: 68, oxygenLevel: 98 },
    { time: '9AM', heartRate: 72, oxygenLevel: 97 },
    { time: '12PM', heartRate: 78, oxygenLevel: 98 },
    { time: '3PM', heartRate: 75, oxygenLevel: 97 },
    { time: '6PM', heartRate: 82, oxygenLevel: 96 },
    { time: '9PM', heartRate: 70, oxygenLevel: 98 }
  ];

  const appointments = [
    { date: "Today", time: "2:30 PM", doctor: "Dr. Sarah Johnson", type: "Cardiology Checkup" },
    { date: "Tomorrow", time: "10:00 AM", doctor: "Dr. Michael Chen", type: "General Consultation" },
    { date: "Thu, May 29", time: "3:00 PM", doctor: "Dr. Emily Davis", type: "Skin Examination" }
  ];

  const quickActions = [
    { icon: MessageCircle, label: 'Symptom Check', action: () => setActiveTab('symptom-checker') },
    { icon: Upload, label: 'Upload Scan', action: () => setActiveTab('disease-detection') },
    { icon: Stethoscope, label: 'Find Doctor', action: () => setActiveTab('doctors') },
    { icon: Calendar, label: 'Book Appointment', action: () => {} }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, John! 👋</h2>
        <p className="text-purple-100 mb-4">Here's your health overview for today</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-lg rounded-lg p-3">
            <Heart className="h-6 w-6 mb-2" />
            <div className="text-lg font-semibold">{wearableData.heartRate} BPM</div>
            <div className="text-sm text-purple-100">Heart Rate</div>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-lg p-3">
            <Activity className="h-6 w-6 mb-2" />
            <div className="text-lg font-semibold">{wearableData.oxygenLevel}%</div>
            <div className="text-sm text-purple-100">O2 Level</div>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-lg p-3">
            <TrendingUp className="h-6 w-6 mb-2" />
            <div className="text-lg font-semibold">{wearableData.bloodPressure}</div>
            <div className="text-sm text-purple-100">Blood Pressure</div>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-lg p-3">
            <Activity className="h-6 w-6 mb-2" />
            <div className="text-lg font-semibold">{wearableData.steps.toLocaleString()}</div>
            <div className="text-sm text-purple-100">Steps Today</div>
          </div>
        </div>
      </div>
      
      {/* Health Charts and Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Charts */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Health Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Area type="monotone" dataKey="heartRate" stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            {appointments.map((apt, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">{apt.doctor}</div>
                  <div className="text-sm text-gray-600">{apt.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-purple-600">{apt.date}</div>
                  <div className="text-sm text-gray-600">{apt.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="bg-white/70 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all group"
            >
              <Icon className="h-8 w-8 text-purple-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-gray-700">{action.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardTab;