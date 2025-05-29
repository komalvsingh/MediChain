import React, { useState, useCallback } from 'react';
import { Upload, Camera, Activity, AlertTriangle, CheckCircle, Clock, FileImage, Brain, Heart, Bone } from 'lucide-react';

const ImageAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleImageSelect = useCallback((file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setError(null);
      setAnalysisResults(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleImageSelect(file);
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const analyzeImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        // Mock analysis - replace with actual API call
        // const response = await fetch('http://localhost:8003/analyze-base64', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ image: base64Data })
        // });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock results
        const mockResults = {
          image_type: 'chest',
          predictions: [
            { label: 'Normal', score: 0.85 },
            { label: 'Pneumonia', score: 0.12 },
            { label: 'COVID-19', score: 0.02 },
            { label: 'Tuberculosis', score: 0.01 }
          ],
          risk_assessment: 'Low Risk - Appears Normal',
          recommendations: [
            'Image appears normal, but regular check-ups are still recommended.',
            'This AI analysis is for screening purposes only.',
            'Schedule follow-up with appropriate specialist if symptoms persist.'
          ],
          confidence_summary: {
            highest_confidence: 0.85,
            average_confidence: 0.25,
            total_predictions: 4
          },
          timestamp: new Date().toISOString()
        };
        
        setAnalysisResults(mockResults);
        setIsAnalyzing(false);
      };
      
      reader.readAsDataURL(selectedImage);
    } catch (err) {
      setError('Analysis failed. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk.includes('Low Risk')) return 'text-green-600 bg-green-50';
    if (risk.includes('Medium Risk')) return 'text-yellow-600 bg-yellow-50';
    if (risk.includes('High Risk')) return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getImageTypeIcon = (type) => {
    switch (type) {
      case 'chest': return <Heart className="w-5 h-5" />;
      case 'brain': return <Brain className="w-5 h-5" />;
      case 'bone': return <Bone className="w-5 h-5" />;
      default: return <FileImage className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full mr-4">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Medical Image Analyzer</h1>
          </div>
          <p className="text-gray-600 text-lg">AI-powered medical image analysis for preliminary screening</p>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center justify-center text-yellow-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="font-medium">For Educational/Research Purposes Only</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-blue-600" />
              Upload Medical Image
            </h2>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50/30"
              onClick={() => document.getElementById('file-input').click()}
            >
              <Camera className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop your medical image here or click to browse</p>
              <p className="text-sm text-gray-500">Supports: JPG, PNG, DICOM</p>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files[0])}
                className="hidden"
              />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Image Preview</h3>
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Selected medical image"
                    className="w-full max-h-64 object-contain rounded-lg border shadow-md bg-gray-50"
                  />
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={analyzeImage}
              disabled={!selectedImage || isAnalyzing}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Analyzing Image...
                </>
              ) : (
                <>
                  <Activity className="w-6 h-6 mr-2" />
                  Analyze Image
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <FileImage className="w-6 h-6 mr-2 text-green-600" />
              Analysis Results
            </h2>

            {!analysisResults ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-500">Upload and analyze an image to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Image Type */}
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  {getImageTypeIcon(analysisResults.image_type)}
                  <span className="ml-2 font-medium text-blue-800 capitalize">
                    {analysisResults.image_type} X-Ray/Scan
                  </span>
                </div>

                {/* Risk Assessment */}
                <div className={`p-4 rounded-lg ${getRiskColor(analysisResults.risk_assessment)}`}>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Risk Assessment</span>
                  </div>
                  <p className="mt-1 font-medium">{analysisResults.risk_assessment}</p>
                </div>

                {/* Predictions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Detected Conditions</h3>
                  <div className="space-y-2">
                    {analysisResults.predictions.map((prediction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{prediction.label}</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${prediction.score * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">
                            {(prediction.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {analysisResults.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start p-3 bg-amber-50 rounded-lg">
                        <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <p className="text-gray-700 text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Highest Confidence</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(analysisResults.confidence_summary.highest_confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Predictions</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analysisResults.confidence_summary.total_predictions}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Important Medical Disclaimer</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                This AI tool is designed for educational and research purposes only. It should not be used as a substitute 
                for professional medical diagnosis, treatment, or advice. Always consult with qualified healthcare 
                professionals for medical concerns. The predictions and recommendations provided are preliminary and 
                require validation by certified radiologists or medical professionals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;