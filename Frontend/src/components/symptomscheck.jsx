import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, MapPin, Hospital, Clock, AlertTriangle, FileText, User, Bot, Navigation } from 'lucide-react';

const SymptomChecker = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [currentClinics, setCurrentClinics] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    getUserLocation();
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (showMap && currentClinics.length > 0 && window.google && userLocation) {
      initializeMap();
    }
  }, [showMap, currentClinics, userLocation]);

  const loadGoogleMapsScript = () => {
    if (window.google) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !userLocation) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
      zoom: 13,
      styles: [
        {
          featureType: 'poi.medical',
          elementType: 'geometry',
          stylers: [{ color: '#ffeaa7' }]
        }
      ]
    });

    mapInstanceRef.current = map;

    // Add user location marker
    new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24)
      }
    });

    // Add clinic markers
    currentClinics.forEach((clinic, index) => {
      // For demo purposes, we'll place clinics around the user location
      // In real implementation, you'd get actual coordinates from the backend
      const offset = 0.01 * (index + 1);
      const lat = userLocation.latitude + offset * Math.cos(index * 60 * Math.PI / 180);
      const lng = userLocation.longitude + offset * Math.sin(index * 60 * Math.PI / 180);

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: clinic.name,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="12" fill="#EF4444"/>
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${clinic.name}</h3>
            <p style="margin: 4px 0; font-size: 14px;">${clinic.address}</p>
            ${clinic.rating ? `<p style="margin: 4px 0; font-size: 14px;">⭐ ${clinic.rating}/5</p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; color: #666;">${clinic.distance}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  }, [userLocation, currentClinics]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        handleVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceInput = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    if (userLocation) {
      formData.append('latitude', userLocation.latitude);
      formData.append('longitude', userLocation.longitude);
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8001/api/process-voice', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessages(prev => [
          ...prev,
          { type: 'user', content: result.transcribed_text, isVoice: true },
          { type: 'bot', content: result.analysis }
        ]);
        
        if (result.analysis.nearby_clinics) {
          setCurrentClinics(result.analysis.nearby_clinics);
        }
      } else {
        throw new Error(result.detail || 'Voice processing failed');
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      setMessages(prev => [
        ...prev,
        { type: 'error', content: 'Failed to process voice input. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    setMessages(prev => [...prev, { type: 'user', content: userMessage, isVoice: false }]);

    try {
      const response = await fetch('http://localhost:8001/api/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: userMessage,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { type: 'bot', content: result.analysis }]);
        
        if (result.analysis.nearby_clinics) {
          setCurrentClinics(result.analysis.nearby_clinics);
        }
      } else {
        throw new Error(result.detail || 'Text processing failed');
      }
    } catch (error) {
      console.error('Error processing text:', error);
      setMessages(prev => [
        ...prev,
        { type: 'error', content: 'Failed to process your symptoms. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnalysis = (analysis) => {
    if (!analysis) return null;

    return (
      <div className="space-y-4">
        {analysis.conditions && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Probable Conditions
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {analysis.conditions.map((condition, idx) => (
                <li key={idx} className="text-blue-700">{condition}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.tests && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Suggested Tests
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {analysis.tests.map((test, idx) => (
                <li key={idx} className="text-green-700">{test}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.urgency && (
          <div className={`p-4 rounded-lg ${
            analysis.urgency.toLowerCase() === 'emergency' ? 'bg-red-50' :
            analysis.urgency.toLowerCase() === 'moderate' ? 'bg-yellow-50' : 'bg-gray-50'
          }`}>
            <h4 className={`font-semibold mb-2 flex items-center ${
              analysis.urgency.toLowerCase() === 'emergency' ? 'text-red-800' :
              analysis.urgency.toLowerCase() === 'moderate' ? 'text-yellow-800' : 'text-gray-800'
            }`}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Urgency: {analysis.urgency}
            </h4>
          </div>
        )}

        {analysis.first_aid && (
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              First Aid
            </h4>
            <p className="text-orange-700">{analysis.first_aid}</p>
          </div>
        )}

        {analysis.nearby_clinics && analysis.nearby_clinics.length > 0 && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-purple-800 flex items-center">
                <Hospital className="w-4 h-4 mr-2" />
                Nearby Clinics
              </h4>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors flex items-center"
              >
                <Navigation className="w-3 h-3 mr-1" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
            
            {showMap && (
              <div className="mb-4 rounded-lg overflow-hidden border-2 border-purple-200">
                <div
                  ref={mapRef}
                  style={{ height: '300px', width: '100%' }}
                  className="bg-gray-200"
                />
              </div>
            )}
            
            <div className="space-y-3">
              {analysis.nearby_clinics.map((clinic, idx) => (
                <div key={idx} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-purple-800">{clinic.name}</h5>
                      <p className="text-sm text-purple-600">{clinic.address}</p>
                      {clinic.rating && (
                        <p className="text-sm text-purple-600">⭐ {clinic.rating}/5</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-600 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {clinic.distance}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-6">
        <h1 className="text-3xl font-bold mb-2">🩺 AI Symptom Checker</h1>
        <p className="text-blue-100">Describe your symptoms in text or voice, get instant medical insights with nearby clinic locations</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Hello! I'm your AI health assistant.</p>
              <p className="text-sm">Describe your symptoms and I'll help you understand what might be going on.</p>
              <p className="text-xs mt-2 text-gray-400">📍 Location services enabled for nearby clinic search</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-lg p-4 ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-white border shadow-sm'
                }`}>
                  {message.type === 'user' && (
                    <div className="flex items-center mb-2">
                      <User className="w-4 h-4 mr-2" />
                      <span className="text-sm opacity-80">
                        {message.isVoice ? 'Voice Input' : 'Text Input'}
                      </span>
                    </div>
                  )}
                  {message.type === 'bot' && (
                    <div className="flex items-center mb-2">
                      <Bot className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm text-gray-600">AI Analysis</span>
                    </div>
                  )}
                  
                  {message.type === 'bot' && typeof message.content === 'object' 
                    ? renderAnalysis(message.content)
                    : <p className="whitespace-pre-wrap">{message.content}</p>
                  }
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 mr-2 text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your symptoms here..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit(e);
              }
            }}
          />
          
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            disabled={isLoading}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button
            type="button"
            onClick={handleTextSubmit}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>💡 Tip: You can type or use voice input to describe your symptoms</span>
          {userLocation && (
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Location detected - Maps enabled
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;