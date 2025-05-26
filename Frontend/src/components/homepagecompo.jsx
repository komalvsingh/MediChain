import React, { useState } from 'react';
import { 
  Stethoscope, 
  Shield, 
  Brain, 
  Heart, 
  Users, 
  FileText, 
  Lock, 
  Activity,
  User,
  Menu,
  X,
  ChevronRight,
  Zap,
  Globe,
  Award
} from 'lucide-react';

// Navigation Component


// Hero Section Component
export const HeroSection = ({ userType }) => {
  const heroContent = {
    patient: {
      title: "Your Health, Your Control",
      subtitle: "AI-powered early disease detection with complete privacy and control over your medical data",
      cta: "Start Health Assessment",
      features: ["AI Symptom Checker", "Secure Health Records", "Early Disease Detection"]
    },
    doctor: {
      title: "Advanced Medical Intelligence",
      subtitle: "Access AI-powered diagnostics and secure patient records with blockchain-verified permissions",
      cta: "Access Doctor Portal",
      features: ["AI-Assisted Diagnosis", "Secure Patient Access", "Analytics Dashboard"]
    }
  };

  const content = heroContent[userType];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pt-16 pb-24">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-pink-100/20"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {content.title}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {content.subtitle}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {content.features.map((feature, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-200">
                <span className="text-purple-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 mx-auto">
            <span>{content.cta}</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Features Grid Component
export const FeaturesGrid = ({ userType }) => {
  const patientFeatures = [
    {
      icon: Brain,
      title: "AI Health Assistant",
      description: "Multilingual symptom checker with intelligent disease prediction",
      color: "from-blue-400 to-purple-400"
    },
    {
      icon: Shield,
      title: "Secure Health Vault",
      description: "Your medical records encrypted and stored on blockchain",
      color: "from-purple-400 to-pink-400"
    },
    {
      icon: Activity,
      title: "Early Detection",
      description: "AI-powered analysis of X-rays, MRIs, and lab reports",
      color: "from-pink-400 to-red-400"
    },
    {
      icon: Heart,
      title: "Health Passport",
      description: "Universal health identity as a secure digital passport",
      color: "from-red-400 to-orange-400"
    }
  ];

  const doctorFeatures = [
    {
      icon: Users,
      title: "Patient Management",
      description: "Secure access to patient records with permission-based system",
      color: "from-blue-400 to-purple-400"
    },
    {
      icon: FileText,
      title: "AI Diagnostics",
      description: "Advanced AI models to assist in medical diagnosis",
      color: "from-purple-400 to-pink-400"
    },
    {
      icon: Lock,
      title: "Blockchain Security",
      description: "Tamper-proof medical records with complete audit trail",
      color: "from-pink-400 to-red-400"
    },
    {
      icon: Zap,
      title: "Smart Analytics",
      description: "Real-time insights and health trend analysis",
      color: "from-red-400 to-orange-400"
    }
  ];

  const features = userType === 'patient' ? patientFeatures : doctorFeatures;

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {userType === 'patient' ? 'Empowering Your Health Journey' : 'Advanced Medical Tools'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {userType === 'patient' 
              ? 'Experience the future of healthcare with AI-powered insights and blockchain security'
              : 'Leverage cutting-edge technology to provide better patient care and outcomes'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stats Section Component
export const StatsSection = ({ userType }) => {
  const patientStats = [
    { number: '99.2%', label: 'Accuracy Rate', icon: Brain },
    { number: '24/7', label: 'AI Availability', icon: Activity },
    { number: '100%', label: 'Data Privacy', icon: Shield },
    { number: '50+', label: 'Languages Supported', icon: Globe }
  ];

  const doctorStats = [
    { number: '10,000+', label: 'Patients Served', icon: Users },
    { number: '95%', label: 'Diagnostic Accuracy', icon: Brain },
    { number: '50%', label: 'Time Saved', icon: Zap },
    { number: '100%', label: 'Secure Access', icon: Lock }
  ];

  const stats = userType === 'patient' ? patientStats : doctorStats;

  return (
    <div className="py-20 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200">
                <stat.icon className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// CTA Section Component
export const CTASection = ({ userType }) => {
  return (
    <div className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <Award className="h-16 w-16 text-white mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-white mb-4">
          {userType === 'patient' ? 'Take Control of Your Health Today' : 'Join the Medical Revolution'}
        </h2>
        <p className="text-xl text-purple-100 mb-8">
          {userType === 'patient' 
            ? 'Start your journey towards better health with AI-powered insights and secure data management'
            : 'Enhance your practice with advanced AI tools and secure patient data management'
          }
        </p>
        <button className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
          {userType === 'patient' ? 'Get Started Free' : 'Request Demo'}
        </button>
      </div>
    </div>
  );
};

// Footer Component
export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-2 rounded-xl">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">MediChain AI</span>
            </div>
            <p className="text-gray-400">
              Revolutionizing healthcare with AI and blockchain technology.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">AI Diagnosis</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Health Records</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Symptom Checker</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">HIPAA Compliance</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 MediChain AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
