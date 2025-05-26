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

function App(){
  return(
    <>
  
    <Routes>
      <Route path="/" element={<Homepage/>} />
      <Route path="/login" element={<SignInForm/>} />
      <Route path="/register" element={<SignUpForm />} />
    </Routes>
  
    
    </>
  );
}
export default App;