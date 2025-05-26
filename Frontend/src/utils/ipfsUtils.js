/**
 * IPFS Utilities for MediChain
 * 
 * This utility provides functions for:
 * 1. Encrypting files using AES-256
 * 2. Uploading encrypted files to IPFS via Pinata
 * 3. Retrieving encrypted files from IPFS
 * 4. Decrypting files
 * 
 * Note: This requires crypto-js to be installed:
 * npm install crypto-js
 */

// Import crypto-js for encryption/decryption
// If not installed, run: npm install crypto-js
import CryptoJS from 'crypto-js';

// Pinata API endpoints
const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

// Get JWT token from environment variables
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_ACCESS_TOKEN || 
                   process.env.PINATA_JWT_ACCESS_TOKEN;

/**
 * Encrypts file data using AES-256
 * @param {string|ArrayBuffer} fileData - The file data to encrypt
 * @param {string} encryptionKey - The encryption key
 * @returns {string} - The encrypted data as a string
 */
export const encryptFile = (fileData, encryptionKey) => {
  try {
    // Convert ArrayBuffer to string if needed
    let dataToEncrypt = fileData;
    if (fileData instanceof ArrayBuffer) {
      dataToEncrypt = new TextDecoder().decode(fileData);
    }
    
    // Encrypt the data
    return CryptoJS.AES.encrypt(dataToEncrypt, encryptionKey).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
};

/**
 * Decrypts encrypted data
 * @param {string} encryptedData - The encrypted data
 * @param {string} encryptionKey - The encryption key
 * @returns {string} - The decrypted data
 */
export const decryptFile = (encryptedData, encryptionKey) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file. Check if the encryption key is correct.');
  }
};

/**
 * Uploads an encrypted file to IPFS via Pinata
 * @param {File|Blob} file - The file to upload
 * @param {string} encryptionKey - The encryption key
 * @param {Object} metadata - Optional metadata for the file
 * @returns {Promise<string>} - The IPFS hash (CID)
 */
export const uploadEncryptedFile = async (file, encryptionKey, metadata = {}) => {
  try {
    // Read the file
    const fileData = await file.arrayBuffer();
    const fileText = new TextDecoder().decode(fileData);
    
    // Encrypt the file
    const encrypted = encryptFile(fileText, encryptionKey);
    
    // Create a blob from the encrypted data
    const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });
    
    // Create a file from the blob
    const encryptedFile = new File([encryptedBlob], file.name, { type: 'text/plain' });
    
    // Upload to Pinata
    return await uploadToPinata(encryptedFile, metadata);
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload encrypted file to IPFS');
  }
};

/**
 * Uploads a file to Pinata
 * @param {File|Blob} file - The file to upload
 * @param {Object} metadata - Optional metadata for the file
 * @returns {Promise<string>} - The IPFS hash (CID)
 */
export const uploadToPinata = async (file, metadata = {}) => {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT token not found. Please check your environment variables.');
  }

  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      const metadataJSON = JSON.stringify({
        name: metadata.name || file.name,
        keyvalues: metadata
      });
      formData.append('pinataMetadata', metadataJSON);
    }
    
    // Upload to Pinata
    const response = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Pinata API error: ${errorData.error?.reason || response.statusText}`);
    }
    
    const result = await response.json();
    return result.IpfsHash; // Return the CID
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw new Error('Failed to upload file to Pinata');
  }
};

/**
 * Fetches an encrypted file from IPFS and decrypts it
 * @param {string} ipfsHash - The IPFS hash (CID)
 * @param {string} encryptionKey - The encryption key
 * @returns {Promise<string>} - The decrypted file content
 */
export const fetchAndDecryptFile = async (ipfsHash, encryptionKey) => {
  try {
    // Fetch the encrypted file from IPFS
    const response = await fetch(`${PINATA_GATEWAY_URL}${ipfsHash}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file from IPFS: ${response.statusText}`);
    }
    
    const encryptedText = await response.text();
    
    // Decrypt the file
    return decryptFile(encryptedText, encryptionKey);
  } catch (error) {
    console.error('Fetch and decrypt error:', error);
    throw new Error('Failed to fetch and decrypt file from IPFS');
  }
};

/**
 * Generates a URL for an IPFS resource
 * @param {string} ipfsHash - The IPFS hash (CID)
 * @returns {string} - The gateway URL
 */
export const getIpfsUrl = (ipfsHash) => {
  return `${PINATA_GATEWAY_URL}${ipfsHash}`;
};

/**
 * Converts a decrypted file to a downloadable blob URL
 * @param {string} decryptedData - The decrypted file data
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} - A blob URL that can be used for downloading
 */
export const createDownloadableUrl = (decryptedData, mimeType = 'application/octet-stream') => {
  const blob = new Blob([decryptedData], { type: mimeType });
  return URL.createObjectURL(blob);
};

/**
 * Helper function to download a file
 * @param {string} url - The URL of the file
 * @param {string} filename - The name to save the file as
 */
export const downloadFile = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Clean up
};

/**
 * Example usage for medical reports in MediChain
 * 
 * // To upload an encrypted medical report:
 * const uploadMedicalReport = async (file, patientKey) => {
 *   try {
 *     // Upload encrypted file to IPFS
 *     const ipfsHash = await uploadEncryptedFile(file, patientKey, {
 *       patientId: "anonymized-id",
 *       reportType: "medical-scan",
 *       timestamp: Date.now()
 *     });
 *     
 *     // Store the IPFS hash in the blockchain
 *     await medVault.uploadReport(ethers.utils.id(ipfsHash));
 *     
 *     return ipfsHash;
 *   } catch (error) {
 *     console.error("Error uploading medical report:", error);
 *     throw error;
 *   }
 * };
 * 
 * // To retrieve and decrypt a medical report:
 * const viewMedicalReport = async (ipfsHash, patientKey) => {
 *   try {
 *     // Fetch and decrypt the report
 *     const decryptedReport = await fetchAndDecryptFile(ipfsHash, patientKey);
 *     
 *     // For JSON reports
 *     const reportData = JSON.parse(decryptedReport);
 *     
 *     // For binary files (like images), create a viewable URL
 *     const blobUrl = createDownloadableUrl(decryptedReport, 'application/pdf');
 *     
 *     return { reportData, blobUrl };
 *   } catch (error) {
 *     console.error("Error retrieving medical report:", error);
 *     throw error;
 *   }
 * };
 */