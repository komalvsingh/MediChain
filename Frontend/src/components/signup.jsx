import React, { useState } from "react";
import axios from "axios";
import Button from "../components/button.jsx";
import Navbar from "./Navbar.jsx";
import { useNavigate } from "react-router-dom";

const SignUpForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    usertype: "",
    gender: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); 
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Connect to Metamask
    if (!window.ethereum) {
      alert("Please install Metamask!");
      return setLoading(false);
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const wallet = accounts[0];

      // POST to backend
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        ...form,
        wallet,
      });

      // Save token (optional)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Callback for success (e.g., redirect or show message)
      if (onSuccess){
        onSuccess(res.data.user);
       
      } 

       navigate("/login");
    } catch (err) {
      console.error("Signup error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Navbar/>
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}

      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          className="w-full mt-1 p-2 border rounded-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">User Type</label>
          <select
            name="usertype"
            required
            value={form.usertype}
            onChange={handleChange}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="">Select</option>
            <option>Patient</option>
            <option>Doctor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Gender</label>
          <select
            name="gender"
            required
            value={form.gender}
            onChange={handleChange}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          name="email"
          required
          value={form.email}
          onChange={handleChange}
          className="w-full mt-1 p-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          name="password"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full mt-1 p-2 border rounded-md"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Registering..." : "Sign Up with Wallet"}
      </Button>
    </form>
    </>
  );
};

export default SignUpForm;
