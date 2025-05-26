# MediChain IPFS Utilities

## Overview

This directory contains utilities for interacting with IPFS (InterPlanetary File System) via Pinata for the MediChain application. These utilities enable secure storage and retrieval of medical reports by:

1. Encrypting files client-side using AES-256 encryption
2. Uploading encrypted files to IPFS via Pinata
3. Retrieving encrypted files from IPFS
4. Decrypting files client-side

## Installation

The IPFS utilities require the `crypto-js` library for encryption/decryption. Install it using npm:

```bash
npm install crypto-js
```

## Configuration

The utilities use a Pinata JWT access token stored in the `.env` file. Make sure your `.env` file contains:

```
PINATA_JWT_ACCESS_TOKEN=your_jwt_token_here
```

For Vite-based applications, you may need to prefix environment variables with `VITE_`:

```
VITE_PINATA_JWT_ACCESS_TOKEN=your_jwt_token_here
```

## Files

- `ipfsUtils.js`: Core utilities for IPFS operations
- `ipfsExample.jsx`: Example React component demonstrating usage

## Usage

### Basic Usage

```javascript
import { 
  uploadEncryptedFile, 
  fetchAndDecryptFile,
  createDownloadableUrl,
  downloadFile 
} from './utils/ipfsUtils';

// Upload an encrypted file to IPFS
const uploadMedicalReport = async (file, encryptionKey) => {
  try {
    // Upload encrypted file to IPFS
    const ipfsHash = await uploadEncryptedFile(file, encryptionKey, {
      patientId: "anonymized-id",
      reportType: "medical-scan",
      timestamp: Date.now()
    });
    
    // Store the IPFS hash in the blockchain
    await medVault.uploadReport(ipfsHash);
    
    return ipfsHash;
  } catch (error) {
    console.error("Error uploading medical report:", error);
    throw error;
  }
};

// Retrieve and decrypt a file from IPFS
const viewMedicalReport = async (ipfsHash, encryptionKey) => {
  try {
    // Fetch and decrypt the report
    const decryptedReport = await fetchAndDecryptFile(ipfsHash, encryptionKey);
    
    // For JSON reports
    const reportData = JSON.parse(decryptedReport);
    
    // For binary files (like images), create a viewable URL
    const blobUrl = createDownloadableUrl(decryptedReport, 'application/pdf');
    
    return { reportData, blobUrl };
  } catch (error) {
    console.error("Error retrieving medical report:", error);
    throw error;
  }
};
```

### Integration with MediChain

The example component `ipfsExample.jsx` demonstrates how to integrate these utilities with the MediChain blockchain context. It shows:

1. How to upload encrypted medical reports to IPFS
2. How to store the IPFS hash on the blockchain
3. How to retrieve and decrypt medical reports from IPFS
4. How to display or download the decrypted reports

## Security Considerations

1. **Encryption Key Management**: The encryption key is never sent to the server or stored on the blockchain. Users must securely store their encryption keys.

2. **Client-Side Encryption**: All encryption and decryption happens client-side, ensuring that unencrypted data never leaves the user's browser.

3. **Data Privacy**: Only encrypted data is stored on IPFS, protecting patient privacy even if the IPFS hash is known.

## Best Practices

1. **Key Management**: Consider implementing a secure key management system, such as splitting the key between the user and a trusted guardian.

2. **Metadata**: Be careful about what metadata you include with the file, as this is not encrypted.

3. **File Size**: Large files may take longer to encrypt/decrypt and upload/download. Consider implementing progress indicators for better user experience.

4. **Error Handling**: Implement robust error handling for network issues, invalid encryption keys, etc.

## Example Implementation

See `ipfsExample.jsx` for a complete example of how to use these utilities in a React component.