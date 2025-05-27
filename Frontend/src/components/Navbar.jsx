import React, { useContext, useState, useEffect } from "react";
import { Button } from "./button.jsx";
import { connectWallet, disconnectWallet } from "../utils/wallet";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { useMediChain } from "../context/BlockChainContext.jsx";
import axios from "axios";

const Navbar = () => {
  const [wallet, setWallet] = useState(null);
  const [mintStatus, setMintStatus] = useState({
    loading: false,
    error: null,
    success: false,
    tokenId: null
  });
  const { user, logout } = useContext(AuthContext);
  const { userHealthID, connectWallet: connectBlockchainWallet } = useMediChain();

  const handleWalletConnect = async () => {
    const address = await connectWallet();
    setWallet(address);
    
    // Also connect to blockchain context
    if (address) {
      await connectBlockchainWallet();
      
      // Check if user already has a HealthID
      try {
        const response = await axios.get(`http://localhost:5000/api/blockchain/check-health-id/${address}`);
        if (response.data.hasHealthID) {
          setMintStatus({
            loading: false,
            error: null,
            success: true,
            tokenId: response.data.tokenId
          });
        }
      } catch (error) {
        console.error("Error checking HealthID:", error);
      }
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setWallet(null);
    setMintStatus({
      loading: false,
      error: null,
      success: false,
      tokenId: null
    });
  };

  const handleMintHealthID = async () => {
    if (!wallet) return;
    
    setMintStatus({
      loading: true,
      error: null,
      success: false,
      tokenId: null
    });
    
    try {
      // Add JWT token from localStorage or user context
      const token = localStorage.getItem('token') || (user && user.token);
      const response = await axios.post('http://localhost:5000/api/blockchain/mint-health-id', {
        walletAddress: wallet
      }, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      
      setMintStatus({
        loading: false,
        error: null,
        success: true,
        tokenId: response.data.tokenId
      });
    } catch (error) {
      console.error("Error minting HealthID:", error);
      setMintStatus({
        loading: false,
        error: error.response?.data?.error || "Failed to mint HealthID",
        success: false,
        tokenId: null
      });
    }
  };

  // Optional: Check if wallet is already connected on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          await connectBlockchainWallet();
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

        {/* Display HealthID if available */}
        {(userHealthID || mintStatus.tokenId) && (
          <span className="text-sm text-green-600 font-semibold">
            🆔 HealthID: #{userHealthID || mintStatus.tokenId}
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

        {/* Mint HealthID button - only show if wallet is connected and user doesn't have a HealthID yet */}
        {wallet && !userHealthID && !mintStatus.success && (
          <Button 
            variant="primary" 
            onClick={handleMintHealthID}
            disabled={mintStatus.loading}
          >
            {mintStatus.loading ? "Minting..." : "Mint HealthID"}
          </Button>
        )}

        {/* Error message */}
        {mintStatus.error && (
          <span className="text-sm text-red-500">{mintStatus.error}</span>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
