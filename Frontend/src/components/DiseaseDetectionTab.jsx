import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import React from 'react';

const MedicalReportAnalyzer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // API base URL - adjust this based on your backend deployment
  const API_BASE_URL = 'http://localhost:8002';

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (PNG, JPG, JPEG, TIFF, BMP)');
      return;
    }

    // Validate file size (16MB max)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 16MB');
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to the analysis server. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const resetAnalysis = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
  };

  const getStatusColor = (status) => {
    if (status === 'normal' || status === 'optimal' || status === 'good') return 'text-green-600';
    if (status === 'borderline_high' || status === 'elevated' || status === 'low_normal') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (normal) => {
    return normal ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Medical Report Analyzer</h2>
          <p className="text-gray-600">Upload medical reports (PDF or images) for AI-powered analysis</p>
        </div>

        {!analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-purple-300 hover:border-purple-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <div className="space-y-2">
                      <p className="text-purple-600 font-medium">Analyzing medical report...</p>
                      <p className="text-sm text-gray-500">This may take a few moments</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <FileText className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drop your medical report here or click to browse</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Choose File
                    </label>
                    {uploadedFile && (
                      <p className="mt-3 text-sm text-gray-600">
                        Selected: {uploadedFile.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700 font-medium">Error</p>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-500" />
                  What We Analyze
                </h3>
                <div className="space-y-3">
                  {[
                    'Lab values (glucose, cholesterol, blood pressure)',
                    'Medical conditions detection',
                    'Abnormal findings identification',
                    'Health summary generation'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Supported Formats</h3>
                <div className="space-y-2">
                  {[
                    'PDF medical reports',
                    'PNG/JPG lab results',
                    'TIFF medical images',
                    'BMP scan reports'
                  ].map((format, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-600">{format}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Important Notice
                </h4>
                <p className="text-sm text-amber-700">
                  This AI analysis is for informational purposes only. Always consult with a qualified healthcare professional for proper diagnosis and treatment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Analysis Results</h3>
              <button
                onClick={resetAnalysis}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Analyze New Report
              </button>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Summary
              </h4>
              <p className="text-blue-700">{analysisResult.summary}</p>
              <div className="mt-3 text-xs text-blue-600">
                Analysis completed: {new Date(analysisResult.analysis_timestamp).toLocaleString()}
              </div>
            </div>

            {/* Detected Conditions */}
            {analysisResult.conditions && analysisResult.conditions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Detected Conditions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.conditions.map((condition, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                    >
                      {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lab Values */}
            {analysisResult.lab_details && Object.keys(analysisResult.lab_details).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Lab Values Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analysisResult.lab_details).map(([labName, details]) => (
                    <div key={labName} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-800 capitalize">
                          {labName.replace(/_/g, ' ')}
                        </h5>
                        {getStatusIcon(details.normal)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-gray-900">
                          {details.value}
                        </p>
                        <p className={`text-sm font-medium capitalize ${getStatusColor(details.status)}`}>
                          {details.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>File: {analysisResult.filename}</span>
                <span>Text extracted: {analysisResult.extracted_text_length} characters</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalReportAnalyzer;