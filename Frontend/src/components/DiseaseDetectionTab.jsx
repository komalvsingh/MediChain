import { useState } from 'react';
import { Upload, Camera } from 'lucide-react';
import React from 'react';
const DiseaseDetectionTab = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setIsAnalyzing(true);
      
      // Simulate AI analysis
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 3000);
    }
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
                      <p className="text-purple-600">Analyzing image...</p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 mb-2">Analysis Complete</h3>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>✓ No signs of pneumonia detected</p>
                        <p>✓ Lung structure appears normal</p>
                        <p>⚠ Recommend follow-up with radiologist</p>
                      </div>
                    </div>
                  )}
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