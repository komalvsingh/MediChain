import React, { useState, useRef } from 'react';
import { Upload, FileText, Activity, AlertCircle, CheckCircle, Clock, Download, X } from 'lucide-react';

const MedicalReportAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'];
  const maxFileSize = 16; // MB
  const apiUrl = 'http://localhost:8002'; // Adjust this to match your API URL

  const handleFileSelect = (selectedFile) => {
    setError(null);
    setResults(null);

    // Validate file type
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (!supportedFormats.includes(fileExtension)) {
      setError(`File type not supported. Please upload: ${supportedFormats.join(', ').toUpperCase()}`);
      return;
    }

    // Validate file size
    if (selectedFile.size > maxFileSize * 1024 * 1024) {
      setError(`File size too large. Maximum size is ${maxFileSize}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const analyzeReport = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      if (data.success) {
        setResults(data.data);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getLabValueStatus = (labValue) => {
    if (labValue.normal) {
      return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Medical Report Analyzer</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload your medical reports (PDF or images) for AI-powered analysis. 
          Get insights on lab values, potential conditions, and health indicators.
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {file ? (
            <div className="space-y-4">
              <FileText className="w-16 h-16 text-green-600 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={analyzeReport}
                  disabled={isAnalyzing}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Analyze Report
                    </>
                  )}
                </button>
                <button
                  onClick={clearFile}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your medical report here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: {supportedFormats.join(', ').toUpperCase()}
                </p>
                <p className="text-sm text-gray-500">Maximum file size: {maxFileSize}MB</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={supportedFormats.map(fmt => `.${fmt}`).join(',')}
          className="hidden"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Error</p>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">Analysis Summary</h2>
            <p className="text-blue-800">{results.summary}</p>
            <div className="mt-4 text-sm text-blue-600">
              <p>Analysis completed: {new Date(results.analysis_timestamp).toLocaleString()}</p>
              <p>Text extracted: {results.extracted_text_length} characters</p>
            </div>
          </div>

          {/* Conditions */}
          {results.conditions && results.conditions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Potential Conditions</h2>
              <div className="grid gap-3">
                {results.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium capitalize">
                      {condition.replace(/_/g, ' ')}
                    </span>
                    {results.keyword_confidence[condition] && (
                      <span className="ml-auto text-sm text-yellow-600">
                        Confidence: {(results.keyword_confidence[condition] * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab Values */}
          {results.lab_details && Object.keys(results.lab_details).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lab Values</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(results.lab_details).map(([labName, labValue]) => {
                  const status = getLabValueStatus(labValue);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={labName} className={`p-4 rounded-lg border ${status.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {labName.replace(/_/g, ' ')}
                        </h3>
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-gray-900">{labValue.value}</p>
                        <p className={`text-sm font-medium ${status.color} capitalize`}>
                          {labValue.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Medical Disclaimer</p>
                <p className="text-amber-700 text-sm mt-1">
                  This analysis is for informational purposes only and should not replace professional medical advice. 
                  Always consult with a qualified healthcare provider for proper diagnosis and treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg text-center max-w-sm mx-4">
            <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Report</h3>
            <p className="text-gray-600">
              Processing your medical report with AI analysis. This may take a few moments...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalReportAnalyzer;