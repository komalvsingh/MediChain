import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip,
  Smile,
  Circle,
  Check,
  CheckCheck
} from 'lucide-react';

const ChatModal = ({ 
  doctor, 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  onTyping, 
  isConnected 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = 'patient123'; // This would come from your auth context

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = (value) => {
    setNewMessage(value);
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      onTyping(doctor._id, true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(doctor._id, false);
      }, 1000);
    } else {
      setIsTyping(false);
      onTyping(doctor._id, false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    onSendMessage(doctor._id, newMessage.trim());
    setNewMessage('');
    setIsTyping(false);
    onTyping(doctor._id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp || message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="text-3xl">{doctor.image || '👨‍⚕️'}</div>
              <Circle 
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
                  isConnected ? 'fill-green-400 text-green-400' : 'fill-gray-300 text-gray-300'
                }`} 
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
                <span>{doctor.name}</span>
                {!isConnected && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                    Offline
                  </span>
                )}
              </h3>
              <p className="text-sm text-purple-600">{doctor.specialization}</p>
              <p className="text-xs text-gray-500">
                {isConnected ? 'Online' : 'Last seen recently'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:bg-purple-100 rounded-full transition-colors">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-purple-100 rounded-full transition-colors">
              <Video className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-purple-100 rounded-full transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-purple-25 to-pink-25">
          {Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p>Send a message to {doctor.name} to begin your consultation</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-6">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </div>
                </div>
                
                {/* Messages for this date */}
                {dayMessages.map((message, index) => {
                  const isOwn = message.senderId === currentUserId;
                  const showAvatar = !isOwn && (
                    index === 0 || 
                    dayMessages[index - 1]?.senderId !== message.senderId
                  );
                  
                  return (
                    <div
                      key={message.id || message._id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                        showAvatar ? 'mt-4' : 'mt-1'
                      }`}
                    >
                      {/* Avatar for doctor messages */}
                      {!isOwn && showAvatar && (
                        <div className="text-2xl mr-3 mt-1">{doctor.image || '👨‍⚕️'}</div>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${!isOwn && !showAvatar ? 'ml-11' : ''}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            isOwn
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                          } ${
                            isOwn ? 'rounded-br-md' : 'rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <div className={`flex items-center justify-between mt-2 ${
                            isOwn ? 'flex-row-reverse' : 'flex-row'
                          }`}>
                            <p 
                              className={`text-xs ${
                                isOwn ? 'text-purple-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(message.timestamp || message.createdAt)}
                            </p>
                            {isOwn && (
                              <div className="flex items-center space-x-1">
                                {message.isRead ? (
                                  <CheckCheck className="w-3 h-3 text-purple-200" />
                                ) : (
                                  <Check className="w-3 h-3 text-purple-200" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="text-2xl mr-3">{doctor.image || '👨‍⚕️'}</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-gray-100 bg-white">
          {!isConnected && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              Connection lost. Trying to reconnect...
            </div>
          )}
          
          <div className="flex items-end space-x-4">
            <button className="p-2 text-gray-600 hover:bg-purple-100 rounded-full transition-colors">
              <Paperclip className="h-5 w-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                disabled={!isConnected}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            
            <button className="p-2 text-gray-600 hover:bg-purple-100 rounded-full transition-colors">
              <Smile className="h-5 w-5" />
            </button>
            
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;