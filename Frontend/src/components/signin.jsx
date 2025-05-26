import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./button.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import axios from "axios";
import Navbar from "./Navbar.jsx";

const SignInForm = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // 🚀 For redirection

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signin", form);

      // Save token and user to context
      localStorage.setItem("token", res.data.token);
      login(res.data.user);

      // ✅ Redirect to homepage
      navigate("/");

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <>
      <Navbar />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-8">
        {error && <p className="text-red-500">{error}</p>}

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

        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </>
  );
};

export default SignInForm;
