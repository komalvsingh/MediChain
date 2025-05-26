import { MessageCircle } from 'lucide-react';
import React from 'react';
const FloatingActionButton = () => {
  return (
    <div className="fixed bottom-6 right-6">
      <button className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group">
        <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default FloatingActionButton;