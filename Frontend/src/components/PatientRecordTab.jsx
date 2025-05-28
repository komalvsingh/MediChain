import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, User, Wallet, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

const PatientRecordsTab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { patient } = location.state || {};

  const [medicalReports, setMedicalReports] = useState([]);
  const [userHealthID, setUserHealthID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    if (!patient) {
      navigate('/doc-dashboard');
      return;
    }
    
    if (!patient.walletAddress) {
      setError('Patient wallet address not found. This patient may not have connected their wallet yet.');
      setLoading(false);
      return;
    }
    
    fetchPatientReports();
  }, [patient, navigate]);

  const fetchPatientReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/auth/medical-reports/patient/${patient.walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient reports');
      }

      const data = await response.json();
      
      if (data.success) {
        setMedicalReports(data.medicalReports || []);
        setUserHealthID(data.userHealthID);
        setReportCount(data.reportCount || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch patient reports');
      }
      
    } catch (err) {
      console.error('Error fetching patient reports:', err);
      setError(err.message);
      setMedicalReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getSpecificReport = async (index) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/auth/medical-reports/${patient.walletAddress}/${index}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch specific report');
      }

      const data = await response.json();
      return data.report;
      
    } catch (err) {
      console.error('Error fetching specific report:', err);
      throw err;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPatientReports();
    setRefreshing(false);
  };

  useEffect(() => {
    if (patient && patient.walletAddress) {
      fetchPatientReports();
    } else if (patient && !patient.walletAddress) {
      setError('Patient wallet address not found');
      setLoading(false);
    }
  }, [patient]);

  const handleDownload = async (ipfsHash, fileName, index) => {
    try {
      if (index !== undefined) {
        const specificReport = await getSpecificReport(index);
        console.log('Specific report details:', specificReport);
      }

      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      window.open(ipfsUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file: ' + err.message);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
          <p className="text-gray-600 mb-4">No patient data was provided</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Medical Records</h1>
                <p className="text-sm text-gray-600">Patient: {patient.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600">{patient.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Wallet className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-mono">
                    {patient.walletAddress ? 
                      `${patient.walletAddress.slice(0, 6)}...${patient.walletAddress.slice(-4)}` : 
                      'No wallet connected'
                    }
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Age: {patient.age}</p>
              <p className="text-sm text-gray-500">Gender: {patient.gender}</p>
              {userHealthID && (
                <p className="text-sm text-blue-600 font-semibold mt-2">
                  Health ID: {userHealthID}
                </p>
              )}
              {reportCount > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Total Reports: {reportCount}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Loading...' : `${medicalReports.length} report(s) found`}
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600">Loading medical reports...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {error.includes('wallet address') ? 'Wallet Not Connected' : 'Error Loading Reports'}
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex justify-center space-x-3">
                  {error.includes('wallet address') ? (
                    <p className="text-sm text-gray-500">
                      This patient needs to connect their wallet to view medical records.
                    </p>
                  ) : (
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            ) : medicalReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Reports</h3>
                <p className="text-gray-600">No medical reports found for this patient.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {medicalReports.map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {report.fileName || `Medical Report ${index + 1}`}
                          </h4>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{report.date || 'Date not available'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Doctor: {report.doctorName || 'Not specified'}</span>
                            </div>
                          </div>
                          {report.description && (
                            <p className="text-sm text-gray-600 mt-2">{report.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2 font-mono">
                            IPFS: {typeof report === 'string' ? report : report.ipfsHash || report}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(
                          typeof report === 'string' ? report : report.ipfsHash || report,
                          report.fileName,
                          index
                        )}
                        className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRecordsTab;