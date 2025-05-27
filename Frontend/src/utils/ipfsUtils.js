// Import crypto-js for encryption/decryption
import CryptoJS from "crypto-js";

// Pinata API endpoints
const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs/";
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_ACCESS_TOKEN;

// Helper function to generate IV
const generateIV = () => {
  return CryptoJS.lib.WordArray.random(128 / 8);
};

// Helper function to convert ArrayBuffer to WordArray
const arrayBufferToWordArray = (arrayBuffer) => {
  const uint8Array = new Uint8Array(arrayBuffer);
  const words = [];
  for (let i = 0; i < uint8Array.length; i += 4) {
    const word = (uint8Array[i] << 24) | 
                 (uint8Array[i + 1] << 16) | 
                 (uint8Array[i + 2] << 8) | 
                 uint8Array[i + 3];
    words.push(word);
  }
  return CryptoJS.lib.WordArray.create(words, uint8Array.length);
};

// Helper function to convert WordArray to ArrayBuffer
const wordArrayToBuffer = (wordArray) => {
  const bytes = [];
  for (let i = 0; i < wordArray.sigBytes; i++) {
    bytes.push((wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }
  return new Uint8Array(bytes).buffer;
};

// Key validation function
const validateEncryptionKey = (key) => {
  if (typeof key !== 'string') {
    throw new Error('Encryption key must be a string');
  }
  
  // Convert to 32-byte key by padding or truncating
  let normalizedKey = key;
  if (key.length < 32) {
    // Pad with zeros if too short
    normalizedKey = key.padEnd(32, '0');
  } else if (key.length > 32) {
    // Truncate if too long
    normalizedKey = key.substring(0, 32);
  }
  
  return CryptoJS.enc.Utf8.parse(normalizedKey);
};

/**
 * Encrypts file data using AES-256 (text)
 * @param {string|ArrayBuffer} fileData
 * @param {string} encryptionKey
 * @returns {string}
 */
export const encryptFile = (fileData, encryptionKey) => {
  try {
    const key = validateEncryptionKey(encryptionKey);
    let dataToEncrypt = fileData;
    if (fileData instanceof ArrayBuffer) {
      dataToEncrypt = new TextDecoder().decode(fileData);
    }
    return CryptoJS.AES.encrypt(dataToEncrypt, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt file");
  }
};

/**
 * Encrypts binary file data (e.g. images) - FIXED VERSION
 * @param {ArrayBuffer} fileData
 * @param {string} encryptionKey
 * @returns {string} - Base64 encoded string containing IV + ciphertext
 */
export const encryptBinaryFile = (fileData, encryptionKey) => {
  try {
    console.log("Binary encryption input size:", fileData.byteLength);
    
    const key = validateEncryptionKey(encryptionKey);
    const wordArray = arrayBufferToWordArray(fileData);
    const iv = generateIV();
    
    console.log("WordArray created, sigBytes:", wordArray.sigBytes);
    console.log("IV generated:", iv.toString(CryptoJS.enc.Hex));
    
    const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    console.log("Encryption completed, ciphertext length:", encrypted.ciphertext.sigBytes);
    
    // Combine IV and ciphertext properly
    const combined = iv.clone();
    combined.concat(encrypted.ciphertext);
    
    const result = combined.toString(CryptoJS.enc.Base64);
    console.log("Final encrypted result length:", result.length);
    
    return result;
  } catch (error) {
    console.error("Binary encryption error:", error);
    throw new Error("Failed to encrypt binary file");
  }
};

/**
 * Decrypts encrypted data
 * @param {string} encryptedData
 * @param {string} encryptionKey
 * @returns {string}
 */
export const decryptFile = (encryptedData, encryptionKey) => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data');
    }
    const key = validateEncryptionKey(encryptionKey);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const result = decrypted.toString(CryptoJS.enc.Utf8);

    if (!result) {
      throw new Error('Decryption failed - possibly wrong key');
    }
    return result;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Decrypts binary file data encrypted with IV - FIXED VERSION
 * @param {string} encryptedBase64 - Base64 string containing IV + ciphertext
 * @param {string} encryptionKey
 * @returns {ArrayBuffer}
 */
export const decryptBinaryFile = (encryptedBase64, encryptionKey) => {
  try {
    const key = validateEncryptionKey(encryptionKey);
    
    // Parse the base64 data
    const combinedData = CryptoJS.enc.Base64.parse(encryptedBase64);
    
    if (combinedData.sigBytes < 16) {
      throw new Error('Data too short for IV + ciphertext');
    }

    // Extract IV (first 16 bytes)
    const ivWords = [];
    for (let i = 0; i < 4; i++) {
      ivWords.push(combinedData.words[i]);
    }
    const iv = CryptoJS.lib.WordArray.create(ivWords, 16);

    // Extract ciphertext (remaining bytes)
    const ciphertextWords = [];
    for (let i = 4; i < combinedData.words.length; i++) {
      ciphertextWords.push(combinedData.words[i]);
    }
    const ciphertext = CryptoJS.lib.WordArray.create(
      ciphertextWords, 
      combinedData.sigBytes - 16
    );

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      key,
      { 
        iv: iv, 
        mode: CryptoJS.mode.CBC, 
        padding: CryptoJS.pad.Pkcs7 
      }
    );

    return wordArrayToBuffer(decrypted);
  } catch (error) {
    console.error("Binary decryption failed:", error);
    throw new Error(`Binary decryption failed: ${error.message}`);
  }
};

/**
 * Uploads an encrypted file to IPFS via Pinata - FIXED VERSION
 */
export const uploadEncryptedFile = async (
  file,
  encryptionKey,
  metadata = {}
) => {
  try {
    const fileData = await file.arrayBuffer();
    const fileType = file.type;
    
    console.log("Uploading file:", file.name, "Type:", fileType, "Size:", fileData.byteLength);

    let encryptedData;
    let isTextFile = fileType.startsWith("text") || fileType === "application/json";
    
    if (isTextFile) {
      console.log("Using text encryption");
      const fileText = new TextDecoder().decode(fileData);
      encryptedData = encryptFile(fileText, encryptionKey);
    } else {
      console.log("Using binary encryption");
      encryptedData = encryptBinaryFile(fileData, encryptionKey);
    }

    console.log("Encrypted data type:", typeof encryptedData, "Length:", encryptedData.length);
    console.log("Encrypted data preview:", encryptedData.substring(0, 100));

    const encryptedBlob = new Blob([encryptedData], { type: "text/plain" });
    const encryptedFile = new File([encryptedBlob], file.name, {
      type: "text/plain",
    });

    // Store the original file type in metadata for proper decryption
    const enhancedMetadata = {
      ...metadata,
      originalMimeType: fileType,
      encryptionMethod: isTextFile ? 'text' : 'binary'
    };

    return await uploadToPinata(encryptedFile, enhancedMetadata);
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error("Failed to upload encrypted file to IPFS");
  }
};

/**
 * Uploads a file to Pinata
 */
export const uploadToPinata = async (file, metadata = {}) => {
  if (!PINATA_JWT) {
    throw new Error(
      "Pinata JWT token not found. Please check your environment variables."
    );
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    if (Object.keys(metadata).length > 0) {
      const metadataJSON = JSON.stringify({
        name: metadata.name || file.name,
        keyvalues: metadata,
      });
      formData.append("pinataMetadata", metadataJSON);
    }

    const response = await fetch(PINATA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Pinata API error: ${errorData.error?.reason || response.statusText}`
      );
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error("Pinata upload error:", error);
    throw new Error("Failed to upload file to Pinata");
  }
};

/**
 * Fetches an encrypted file from IPFS and decrypts it - FIXED VERSION
 * @param {string} ipfsHash - The IPFS hash
 * @param {string} encryptionKey - The decryption key
 * @param {string} originalMimeType - Original file MIME type (optional)
 * @returns {Object} - Object with decrypted data and metadata
 */
export const fetchAndDecryptFile = async (ipfsHash, encryptionKey, originalMimeType = null) => {
  try {
    const response = await fetch(`${PINATA_GATEWAY_URL}${ipfsHash}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const content = await response.text();
    
    console.log("Encrypted content preview:", content.substring(0, 100));
    console.log("Original MIME type:", originalMimeType);

    // Check if content is OpenSSL formatted (starts with "Salted__")
    if (content.startsWith('Salted__')) {
      // Text file decryption (CryptoJS format)
      console.log("Using text decryption (OpenSSL format)");
      const decryptedText = decryptFile(content, encryptionKey);
      return {
        data: decryptedText,
        isBinary: false,
        mimeType: originalMimeType || 'text/plain'
      };
    } else {
      // Binary format with IV (Base64 format)
      console.log("Using binary decryption (Base64 format)");
      const decryptedBuffer = decryptBinaryFile(content, encryptionKey);
      return {
        data: decryptedBuffer,
        isBinary: true,
        mimeType: originalMimeType || 'application/octet-stream'
      };
    }
  } catch (error) {
    console.error("Fetch/decrypt error:", error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
};

/**
 * Generates a gateway URL for an IPFS resource
 */
export const getIpfsUrl = (ipfsHash) => `${PINATA_GATEWAY_URL}${ipfsHash}`;

/**
 * Converts a decrypted file to a downloadable blob URL - FIXED VERSION
 * @param {string|ArrayBuffer} decryptedData - The decrypted data
 * @param {string} mimeType - MIME type for the blob
 * @returns {string} - Blob URL for download
 */
export const createDownloadableUrl = (
  decryptedData,
  mimeType = "application/octet-stream"
) => {
  let blob;
  
  if (decryptedData instanceof ArrayBuffer) {
    // Binary data
    blob = new Blob([new Uint8Array(decryptedData)], { type: mimeType });
  } else if (typeof decryptedData === 'string') {
    // Text data
    blob = new Blob([decryptedData], { type: mimeType });
  } else {
    // Handle unexpected data types
    console.error('Unexpected data type:', typeof decryptedData, decryptedData);
    blob = new Blob([String(decryptedData)], { type: 'text/plain' });
  }

  return URL.createObjectURL(blob);
};

/**
 * Triggers a browser download for the file
 */
export const downloadFile = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Complete download workflow - ADDED HELPER FUNCTION
 * @param {string} ipfsHash - IPFS hash of the encrypted file
 * @param {string} encryptionKey - Decryption key
 * @param {string} filename - Desired filename for download
 * @param {string} originalMimeType - Original MIME type (optional)
 */
export const downloadDecryptedFile = async (ipfsHash, encryptionKey, filename, originalMimeType = null) => {
  try {
    console.log("Starting download for:", filename, "MIME type:", originalMimeType);
    
    // Fetch and decrypt the file
    const result = await fetchAndDecryptFile(ipfsHash, encryptionKey, originalMimeType);
    
    console.log("Decryption result:", {
      isBinary: result.isBinary,
      mimeType: result.mimeType,
      dataType: typeof result.data,
      dataSize: result.data instanceof ArrayBuffer ? result.data.byteLength : result.data.length
    });
    
    // Create downloadable URL using the actual decrypted data
    const downloadUrl = createDownloadableUrl(result.data, result.mimeType);
    
    // Trigger download
    downloadFile(downloadUrl, filename);
    
    return result;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
};