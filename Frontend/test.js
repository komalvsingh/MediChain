// Test encryption/decryption roundtrip
const testRoundtrip = async (content, isBinary = false) => {
    const key = 'test-key-1234567890123456';
    const encrypted = isBinary 
      ? encryptBinaryFile(new TextEncoder().encode(content).buffer, key)
      : encryptFile(content, key);
    
    const decrypted = isBinary
      ? new TextDecoder().decode(await decryptBinaryFile(encrypted, key))
      : decryptFile(encrypted, key);
    
    console.assert(decrypted === content, 
      `Roundtrip failed for ${isBinary ? 'binary' : 'text'}`);
  };
  
  await testRoundtrip('Test health record');
  await testRoundtrip('Binary\x00test\xffdata', true);