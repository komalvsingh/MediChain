import { useState, useContext, useEffect } from "react";
import { CTASection, FeaturesGrid, Footer, HeroSection, StatsSection } from "../components/homepagecompo";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import MediChainChatbot from "../components/chatbot";

import React from "react";

function Homepage(){
  const [userType, setUserType] = useState('patient');
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    // Update userType based on authenticated user if available
    if (user && user.usertype) {
      setUserType(user.usertype.toLowerCase());
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar/>
      <MediChainChatbot/>
      <HeroSection userType={userType} />
      <FeaturesGrid userType={userType} />
      <StatsSection userType={userType} />
      <CTASection userType={userType} />
      <Footer />
    </div>
  );
};

export default Homepage;
