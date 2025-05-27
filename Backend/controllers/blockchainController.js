import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the ABI file
const healthIdAbiPath = path.join(__dirname, '..', 'abis', 'HealthIdAbi.json');
const HealthIDAbi = JSON.parse(fs.readFileSync(healthIdAbiPath, 'utf8'));

// Contract address from the deployment
const HEALTH_ID_CONTRACT_ADDRESS = "0x0926920E743431343D90edA86F1B276350DA5A89";

// Create a provider and wallet using the owner's private key
const setupProvider = () => {
  // Using Ethereum mainnet or testnet provider URL
  // For local development, you might use a local node or testnet
  const provider = new ethers.JsonRpcProvider("https://ethereum-holesky.publicnode.com");
  
  // Create a wallet using the owner's private key from environment variables
  const ownerWallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
  
  return { provider, ownerWallet };
};

// Mint a HealthID for a user
export const mintHealthID = async (req, res) => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  try {
    const { ownerWallet } = setupProvider();
    
    // Create contract instance with the owner wallet
    const healthIDContract = new ethers.Contract(
      HEALTH_ID_CONTRACT_ADDRESS,
      HealthIDAbi,
      ownerWallet
    );
    
    // Check if user already has a HealthID
    const balance = await healthIDContract.balanceOf(walletAddress);
    
    if (balance > 0) {
      // User already has a HealthID, get the token ID
      const tokenId = await healthIDContract.addressToTokenId(walletAddress);
      return res.status(200).json({ 
        message: 'User already has a HealthID',
        tokenId: tokenId.toString(),
        alreadyMinted: true
      });
    }
    
    // Mint a new HealthID for the user
    const tx = await healthIDContract.mintHealthID(walletAddress);
    const receipt = await tx.wait();
    
    // Get the token ID from the transaction events or by querying
    const tokenId = await healthIDContract.addressToTokenId(walletAddress);
    
    res.status(201).json({
      message: 'HealthID minted successfully',
      tokenId: tokenId.toString(),
      transactionHash: receipt.hash,
      alreadyMinted: false
    });
  } catch (error) {
    console.error('Error minting HealthID:', error);
    res.status(500).json({ 
      error: 'Failed to mint HealthID', 
      details: error.message 
    });
  }
};

// Check if a user has a HealthID
export const checkHealthID = async (req, res) => {
  const { walletAddress } = req.params;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  try {
    const { provider } = setupProvider();
    
    // Create contract instance with the provider (read-only)
    const healthIDContract = new ethers.Contract(
      HEALTH_ID_CONTRACT_ADDRESS,
      HealthIDAbi,
      provider
    );
    
    // Check if user has a HealthID
    const balance = await healthIDContract.balanceOf(walletAddress);
    
    if (balance > 0) {
      // User has a HealthID, get the token ID
      const tokenId = await healthIDContract.addressToTokenId(walletAddress);
      return res.status(200).json({ 
        hasHealthID: true,
        tokenId: tokenId.toString() 
      });
    }
    
    // User doesn't have a HealthID
    res.status(200).json({ 
      hasHealthID: false 
    });
  } catch (error) {
    console.error('Error checking HealthID:', error);
    res.status(500).json({ 
      error: 'Failed to check HealthID', 
      details: error.message 
    });
  }
};