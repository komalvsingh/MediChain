import { Shield } from 'lucide-react';
import React from 'react';
const ZKPVerificationTab = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Zero Knowledge Proof Verification</h2>
          <p className="text-gray-600">Prove your health status without revealing sensitive medical data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Available Verifications</h3>
            {[
              { title: 'COVID-19 Vaccination', status: 'Verified', icon: '💉' },
              { title: 'TB Screening', status: 'Clear', icon: '🫁' },
              { title: 'General Health Check', status: 'Current', icon: '❤️' },
              { title: 'Mental Health Assessment', status: 'Pending', icon: '🧠' }
            ].map((verification, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{verification.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-800">{verification.title}</h4>
                    <p className="text-sm text-gray-600">Status: {verification.status}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm hover:shadow-lg transition-all">
                  Generate Proof
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-800 mb-3">How ZKP Works</h4>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Your health data stays encrypted and private</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Only verification status is shared</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Cryptographically secure and tamper-proof</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Instantly verifiable by third parties</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Use Cases</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• Travel verification without revealing full medical history</p>
                <p>• Employment health checks with privacy protection</p>
                <p>• Educational institution requirements</p>
                <p>• Insurance verification while maintaining confidentiality</p>
              </div>
            </div>

            <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium">
              Learn More About ZKP
            </button>
          </div>
        </div>

        {/* Recent Proofs Generated */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Proof Generations</h3>
          <div className="space-y-3">
            {[
              { proof: 'COVID-19 Vaccination Proof', date: 'May 25, 2025', recipient: 'Global Airlines', status: 'Active' },
              { proof: 'TB Screening Proof', date: 'May 20, 2025', recipient: 'University Health Center', status: 'Active' },
              { proof: 'General Health Proof', date: 'May 18, 2025', recipient: 'Tech Corp HR', status: 'Expired' }
            ].map((proof, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-800">{proof.proof}</h4>
                  <p className="text-sm text-gray-600">Shared with {proof.recipient} on {proof.date}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  proof.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {proof.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZKPVerificationTab;