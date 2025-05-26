import { useState } from "react";
import { CTASection, FeaturesGrid, Footer, HeroSection, StatsSection } from "../components/homepagecompo";
import Navbar from "../components/Navbar";
import React from "react";
import MediChainChatbot from "../components/chatbot";


function Homepage(){
  const [userType, setUserType] = useState('patient');
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
