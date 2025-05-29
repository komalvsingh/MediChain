import React, { useState } from 'react';
import { 
  Send, 
  AlertTriangle, 
  Heart, 
  Clock, 
  Loader2
} from 'lucide-react';

const SymptomChecker = () => {
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle text symptom submission
  const handleTextSubmit = async () => {
    if (!symptoms.trim()) return;
    
    setLoading(true);
    try {
      console.log('Sending symptoms:', symptoms);
      
      const response = await fetch('http://localhost:8001/api/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: symptoms
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Full response:', data);
      console.log('Analysis data:', data.analysis);
      
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error('No analysis data received');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Clock className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  const renderListItems = (items, defaultMessage = 'No information available') => {
    if (!items) return [defaultMessage];
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') return [items];
    return [defaultMessage];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI Symptom Checker
          </h1>
          <p className="text-gray-600">
            Describe your symptoms and get instant AI-powered health insights
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="space-y-4">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe your symptoms in detail... (e.g., 'I have a headache, fever, and sore throat for 2 days')"
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
            />
            <button
              onClick={handleTextSubmit}
              disabled={loading || !symptoms.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Analyzing...' : 'Analyze Symptoms'}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Urgency Banner */}
            <div className={`rounded-xl p-4 border ${getUrgencyColor(analysis.urgency)}`}>
              <div className="flex items-center">
                {getUrgencyIcon(analysis.urgency)}
                <span className="ml-2 font-semibold">
                  Urgency Level: {analysis.urgency || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Main Analysis */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Symptom Analysis
              </h2>
              
              {analysis.detailed_description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Overview
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {analysis.detailed_description}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Possible Conditions */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">
                    Possible Conditions
                  </h3>
                  <ul className="space-y-2">
                    {renderListItems(analysis.conditions).map((condition, index) => (
                      <li key={index} className="text-blue-700 flex items-start">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {condition}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Possible Causes */}
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3">
                    Possible Causes
                  </h3>
                  <ul className="space-y-2">
                    {renderListItems(analysis.possible_causes).map((cause, index) => (
                      <li key={index} className="text-purple-700 flex items-start">
                        <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Tests */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">
                    Recommended Tests
                  </h3>
                  <ul className="space-y-2">
                    {renderListItems(analysis.tests).map((test, index) => (
                      <li key={index} className="text-green-700 flex items-start">
                        <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {test}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* When to Seek Help */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3">
                    When to Seek Help
                  </h3>
                  <p className="text-orange-700">
                    {analysis.when_to_seek_help || 'Consult with a healthcare professional for proper evaluation'}
                  </p>
                </div>
              </div>

              {/* Home Care Tips */}
              {analysis.home_care_tips && (
                <div className="mt-6 bg-teal-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-teal-800 mb-3">
                    Home Care Tips
                  </h3>
                  <p className="text-teal-700">
                    {analysis.home_care_tips}
                  </p>
                </div>
              )}

              {/* First Aid */}
              {analysis.first_aid && analysis.first_aid !== 'null' && (
                <div className="mt-6 bg-red-50 rounded-xl p-4 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Immediate First Aid
                  </h3>
                  <p className="text-red-700">
                    {analysis.first_aid}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            <strong>Medical Disclaimer:</strong> This tool provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;