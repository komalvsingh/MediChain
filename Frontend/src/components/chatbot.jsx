import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Volume2, Bot, User, AlertCircle } from 'lucide-react';

const MediChainChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm MediChain AI, your AI-powered medical assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const API_BASE_URL = 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text, sender, audioUrl = null) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString(),
      audioUrl
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-play audio for bot responses
    if (sender === 'bot' && audioUrl) {
      setTimeout(() => {
        playAudio(audioUrl);
      }, 500); // Small delay to ensure message is rendered
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage(userMessage, 'user');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: 'user-' + Date.now(),
          language: 'en'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      
      // Add bot response
      addMessage(data.text_response, 'bot', data.audio_file_path);
      
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, I encountered an error. Please try again or consult a healthcare professional.', 'bot');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      addMessage('Unable to access microphone. Please check permissions.', 'bot');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    setIsLoading(true);
    setIsTyping(true);
    addMessage('🎤 Voice message sent', 'user');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.wav');

      const response = await fetch(`${API_BASE_URL}/voice-input`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process voice message');
      }

      const data = await response.json();
      
      // Add transcribed text
      if (data.transcribed_text) {
        addMessage(`Transcribed: "${data.transcribed_text}"`, 'user');
      }
      
      // Add bot response
      addMessage(data.text_response, 'bot', data.audio_file_path);
      
    } catch (error) {
      console.error('Error processing voice message:', error);
      addMessage('Sorry, I couldn\'t process your voice message. Please try again.', 'bot');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const playAudio = async (filename) => {
    try {
      const audio = new Audio(`${API_BASE_URL}/audio/${filename}`);
      audio.volume = 0.8; // Set volume to 80%
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      // Fallback: show a notification that audio couldn't play
      if (error.name === 'NotAllowedError') {
        console.log('Audio autoplay blocked by browser. User interaction required.');
      }
    }
  };

  const isEmergencyMessage = (text) => {
    const emergencyKeywords = ['emergency', 'urgent', 'immediate', 'severe', 'critical', 'chest pain', 'difficulty breathing', 'stroke', 'heart attack'];
    return emergencyKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-rose-300 to-pink-300 hover:from-rose-400 hover:to-pink-400 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 w-96 h-[500px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-lavender-300 to-purple-300 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-white">MediChain AI</h3>
                <p className="text-purple-100 text-xs">Medical Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-blue-50 to-purple-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-green-300 to-emerald-300' 
                      : 'bg-gradient-to-r from-purple-300 to-pink-300'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-3 h-3 text-white" />
                    ) : (
                      <Bot className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl p-3 shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-green-300 to-emerald-300 text-white'
                        : isEmergencyMessage(message.text)
                        ? 'bg-gradient-to-r from-red-200 to-orange-200 border-2 border-red-300'
                        : 'bg-white border border-purple-100'
                    }`}
                  >
                    {isEmergencyMessage(message.text) && message.sender === 'bot' && (
                      <div className="flex items-center space-x-2 mb-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">MEDICAL ALERT</span>
                      </div>
                    )}
                    <p className={`text-sm ${
                      message.sender === 'user' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {message.text}
                    </p>
                    {message.audioUrl && (
                      <button
                        onClick={() => playAudio(message.audioUrl)}
                        className="mt-2 flex items-center space-x-1 text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="text-xs">Replay Audio</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-purple-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-purple-100 bg-white">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your symptoms..."
                  className="w-full p-3 pr-12 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none"
                  rows="1"
                  disabled={isLoading}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`absolute right-2 top-2 p-1 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-red-500 text-white' 
                      : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-300 disabled:to-gray-300 text-white p-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Disclaimer */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              <p>⚠️ This is for informational purposes only. Consult healthcare professionals for medical advice.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediChainChatbot;