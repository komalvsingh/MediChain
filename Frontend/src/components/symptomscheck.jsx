import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

const MedicalReportAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF file or image (PNG, JPG, JPEG)');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF file or image (PNG, JPG, JPEG)');
      }
    }
  };

  const uploadAndAnalyze = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setAnalyzing(true);
    setError('');
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(`Failed to analyze report: ${err.message}`);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!results) return;
    
    const reportContent = `
MEDICAL REPORT ANALYSIS
========================

SUMMARY:
${results.summary}

POTENTIAL CONDITIONS:
${results.conditions?.map(condition => `• ${condition.replace('_', ' ')}`).join('\n') || 'None detected'}

LAB VALUES:
${Object.entries(results.lab_details || {}).map(([lab, details]) => 
  `• ${lab.replace('_', ' ')}: ${details.value} (${details.status.replace('_', ' ')})`
).join('\n') || 'No lab values detected'}

MEDICAL ENTITIES:
${results.entities?.map(entity => 
  `• ${entity.text} (${entity.type}) - Confidence: ${(entity.confidence * 100).toFixed(1)}%`
).join('\n') || 'None detected'}

DISCLAIMER:
This analysis is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for proper medical evaluation.
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical_report_analysis_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setError('');
    setUploading(false);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <FileText className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Medical Report Analyzer</h1>
          </div>
          <p className="text-gray-600 text-lg">Upload your medical report for AI-powered analysis</p>
        </div>

        {/* Upload Section */}
        {!results && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 hover:border-indigo-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Drop your medical report here
              </h3>
              <p className="text-gray-500 mb-4">
                Supports PDF files and images (PNG, JPG, JPEG)
              </p>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Choose File
              </label>
            </div>

            {file && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-indigo-600 mr-2" />
                    <span className="text-gray-700">{file.name}</span>
                    <span className="text-gray-500 ml-2">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={uploadAndAnalyze}
                disabled={!file || uploading}
                className="inline-flex items-center px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    {analyzing ? 'Analyzing Report...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Analyze Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Analyze Another
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Summary</h3>
              <p className="text-blue-700">{results.summary}</p>
            </div>

            {/* Conditions */}
            {results.conditions && results.conditions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Potential Conditions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.conditions.map((condition, index) => {
                    const confidence = results.keyword_confidence?.[condition];
                    return (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-yellow-800">
                            {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {confidence && (
                            <span className="text-sm text-yellow-600">
                              {(confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lab Values */}
            {results.lab_details && Object.keys(results.lab_details).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Lab Values</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Test</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.lab_details).map(([lab, details]) => (
                        <tr key={lab} className={details.normal ? 'bg-green-50' : 'bg-red-50'}>
                          <td className="border border-gray-300 px-4 py-2 font-medium">
                            {lab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{details.value}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              details.normal 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {details.normal ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <AlertCircle className="w-3 h-3 mr-1" />
                              )}
                              {details.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Medical Entities */}
            {results.entities && results.entities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Medical Entities Detected</h3>
                <div className="flex flex-wrap gap-2">
                  {results.entities.slice(0, 10).map((entity, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {entity.text}
                      <span className="ml-2 text-purple-600">
                        ({(entity.confidence * 100).toFixed(0)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">Important Disclaimer</h4>
                  <p className="text-red-700 text-sm">
                    This analysis is for informational purposes only and should not replace professional medical advice, 
                    diagnosis, or treatment. Always consult with qualified healthcare providers for proper medical evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalReportAnalyzer;