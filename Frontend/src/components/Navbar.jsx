import React, { useContext, useState, useEffect } from "react";
import { Button } from "./button.jsx";
import { connectWallet, disconnectWallet } from "../utils/wallet";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const Navbar = () => {
  const [wallet, setWallet] = useState(null);
  const { user, logout } = useContext(AuthContext);

  const handleWalletConnect = async () => {
    const address = await connectWallet();
    setWallet(address);
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setWallet(null);
  };

  // Optional: Check if wallet is already connected on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setWallet(accounts[0]);
        }
      }
    };
    checkWalletConnection();
  }, []);

  return (
    <nav className="flex items-center justify-between bg-white p-4 shadow-md">
      <div className="text-xl font-bold text-indigo-600">🧠 MediChain AI</div>

      <div className="flex items-center gap-4">
        {/* Display logged-in username */}
        {user && (
          <span className="text-sm text-gray-700 font-semibold">
            👋 Hello, {user.name}
          </span>
        )}

        {/* Display wallet address if connected */}
        {wallet && (
          <span className="text-sm text-gray-500">
            🦊 {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </span>
        )}

        {/* Auth buttons */}
        {user ? (
          <Button variant="outline" onClick={logout}>Logout</Button>
        ) : (
          <>
            <Button><Link to="/login">Sign In</Link></Button>
            <Button variant="secondary"><Link to="/register">Sign Up</Link></Button>
          </>
        )}

        {/* Wallet connect/disconnect */}
        {wallet ? (
          <Button variant="outline" onClick={handleWalletDisconnect}>Disconnect Wallet</Button>
        ) : (
          <Button variant="outline" onClick={handleWalletConnect}>Connect Wallet</Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
