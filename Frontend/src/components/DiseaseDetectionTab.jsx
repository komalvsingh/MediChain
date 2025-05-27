import { useState, useEffect } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import React from 'react';

const DiseaseDetectionTab = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [supportedDiseases, setSupportedDiseases] = useState({});

  // Backend API base URL - adjust this to your backend URL
  const API_BASE_URL = 'http://localhost:5001/api';

  // Fetch supported diseases on component mount
  useEffect(() => {
    fetchSupportedDiseases();
  }, []);

  const fetchSupportedDiseases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supported-diseases`);
      if (response.ok) {
        const diseases = await response.json();
        setSupportedDiseases(diseases);
      }
    } catch (error) {
      console.warn('Could not fetch supported diseases:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset previous state
    setError(null);
    setAnalysisResult(null);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, BMP, TIFF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Set uploaded image for preview
    setUploadedImage(URL.createObjectURL(file));
    setUploadedFile(file);
    setIsAnalyzing(true);

    // Prepare form data
    const formData = new FormData();
    formData.append('image', file);

    // Determine image type based on filename
    const filename = file.name.toLowerCase();
    let imageType = null;
    if (filename.includes('chest') || filename.includes('xray') || filename.includes('lung')) {
      imageType = 'chest_xray';
    } else if (filename.includes('mri') || filename.includes('brain')) {
      imageType = 'mri';
    } else if (filename.includes('retinal') || filename.includes('fundus') || filename.includes('eye')) {
      imageType = 'retinal';
    }
    
    if (imageType) {
      formData.append('image_type', imageType);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze-medical-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setAnalysisResult(result);
      } else {
        setError(result.error || 'Analysis failed. Please try again.');
      }
    } catch (error) {
      setError('Failed to connect to analysis service. Please check if the backend is running.');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'moderate': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const resetAnalysis = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Disease Detection</h2>
          <p className="text-gray-600">Upload X-rays, MRIs, or lab reports for AI-powered analysis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              {uploadedImage ? (
                <div className="space-y-4">
                  <img src={uploadedImage} alt="Uploaded scan" className="mx-auto max-h-48 rounded-lg" />
                  
                  {isAnalyzing ? (
                    <div className="space-y-2">
                      <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-purple-600">Analyzing image with AI...</p>
                      <p className="text-sm text-gray-500">This may take a few moments</p>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold text-red-800">Analysis Failed</h3>
                      </div>
                      <p className="text-sm text-red-700 mb-3">{error}</p>
                      <button
                        onClick={resetAnalysis}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : analysisResult ? (
                    <div className={`border rounded-lg p-4 ${getUrgencyColor(analysisResult.urgency_level)}`}>
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        {getUrgencyIcon(analysisResult.urgency_level)}
                        <h3 className="font-semibold">Analysis Complete</h3>
                      </div>
                      
                      {/* Primary Findings */}
                      {analysisResult.primary_findings && analysisResult.primary_findings.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2">Key Findings:</h4>
                          <div className="text-sm space-y-1">
                            {analysisResult.primary_findings.map((finding, index) => (
                              <p key={index}>• {finding}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Disease Predictions */}
                      {analysisResult.disease_predictions && analysisResult.disease_predictions.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2">Disease Analysis:</h4>
                          <div className="text-sm space-y-2">
                            {analysisResult.disease_predictions.map((prediction, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span>{prediction.disease}</span>
                                <span className="font-medium">
                                  {Math.round(prediction.confidence * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {analysisResult.recommendations && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2">Recommendations:</h4>
                          <div className="text-sm space-y-1">
                            {analysisResult.recommendations.slice(0, 3).map((rec, index) => (
                              <p key={index}>• {rec}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={resetAnalysis}
                        className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                      >
                        Analyze Another Image
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Drop your medical images here or click to browse</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:shadow-lg transition-all"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Supported Formats</h3>
            <div className="space-y-2">
              {[
                'X-ray images (Chest, Bone)',
                'MRI scans',
                'CT scans',
                'Lab report images',
                'Retinal images'
              ].map((format, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-600">{format}</span>
                </div>
              ))}
            </div>

            {/* Supported Diseases */}
            {Object.keys(supportedDiseases).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Detectable Conditions</h3>
                {Object.entries(supportedDiseases).map(([imageType, diseases]) => (
                  <div key={imageType} className="mb-3">
                    <h4 className="font-medium text-gray-700 capitalize mb-2">
                      {imageType.replace('_', ' ')}:
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {diseases.map((disease, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>{disease}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-yellow-800 mb-2">Important Notice</h4>
              <p className="text-sm text-yellow-700">
                AI analysis is for preliminary assessment only. Always consult with a qualified healthcare professional for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetectionTab;