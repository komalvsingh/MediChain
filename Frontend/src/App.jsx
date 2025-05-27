import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Homepage from "./pages/homepage";
import SignInForm from "./components/signin";
import SignUpForm from "./components/signup";
import SymptomChecker from "./components/symptomscheck";
import PatientDashboard from "./pages/patientdashboard";
import DoctorDashboard from "./pages/doctordashboard";

import MedicalReportAnalyzer from "./components/MedicalReportAnalyzer";
import PrescriptionGenerator from "./components/PrescriptionGenerator";
import HealthRecordsTab from "./components/HealthRecordsTab";
function App(){
  return(
    <>
  
    <Routes>
      <Route path="/" element={<Homepage/>} />
      <Route path="/login" element={<SignInForm/>} />
      <Route path="/register" element={<SignUpForm />} />
      <Route path="/symptoms" element={<SymptomChecker />} />
      <Route path="/pat-dashboard" element={<PatientDashboard/>} />
      <Route path="/disease" element={<MedicalReportAnalyzer />}></Route>
      <Route path="/doc-dashboard" element={<DoctorDashboard/>} />
      <Route path="/prescription" element={<PrescriptionGenerator/>} />
      <Route path="/record" element={<HealthRecordsTab/>} />
    </Routes>
  
    
    </>
  );
}
export default App;