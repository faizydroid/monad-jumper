/**
 * Encryption utilities for storing sensitive game data on-chain
 * Uses AES-GCM for symmetric encryption with a key derived from the user's wallet
 */
import { ethers } from 'ethers';

/**
 * Generates an encryption key from the user's wallet signature
 * @param {ethers.Signer} signer - The user's wallet signer
 * @param {string} salt - A salt value to make the key unique (e.g., app name)
 * @returns {Promise<Uint8Array>} - A 32-byte key suitable for AES-GCM
 */
export const generateEncryptionKey = async (signer, salt = 'MonadJumperEncryption') => {
  if (!signer) throw new Error('No signer provided');
  
  // Have the user sign a message specific to this application
  const address = await signer.getAddress();
  const message = `${salt}:${address.toLowerCase()}`;
  
  // Get signature from the wallet
  const signature = await signer.signMessage(message);
  
  // Hash the signature to create a deterministic key
  const keyData = ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signature)));
  
  // Return the first 32 bytes for AES-GCM
  return keyData.slice(0, 32);
};

/**
 * Encrypts data using AES-GCM
 * @param {Uint8Array} key - Encryption key (32 bytes)
 * @param {Object} data - Data to encrypt
 * @returns {Promise<string>} - Hex string with encrypted data
 */
export const encryptData = async (key, data) => {
  if (!key || key.length !== 32) throw new Error('Invalid encryption key');
  if (!data) throw new Error('No data provided for encryption');
  
  try {
    // Convert data to string
    const dataStr = JSON.stringify(data);
    
    // Generate a random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const encodedData = new TextEncoder().encode(dataStr);
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      cryptoKey,
      encodedData
    );
    
    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to hex string for storage on-chain
    return ethers.utils.hexlify(result);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data using AES-GCM
 * @param {Uint8Array} key - Encryption key (32 bytes)
 * @param {string} encryptedDataHex - Hex string with encrypted data
 * @returns {Promise<Object>} - Decrypted data object
 */
export const decryptData = async (key, encryptedDataHex) => {
  if (!key || key.length !== 32) throw new Error('Invalid decryption key');
  if (!encryptedDataHex) throw new Error('No encrypted data provided');
  
  try {
    // Convert hex string to Uint8Array
    const encryptedData = ethers.utils.arrayify(encryptedDataHex);
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      cryptoKey,
      ciphertext
    );
    
    // Convert decrypted data to object
    const decryptedText = new TextDecoder().decode(decryptedData);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Convenience function to encrypt game progress with user's wallet
 * @param {ethers.Signer} signer - User's wallet signer
 * @param {Object} gameData - Game data to encrypt
 * @returns {Promise<string>} - Encrypted data as hex string
 */
export const encryptGameProgress = async (signer, gameData) => {
  const key = await generateEncryptionKey(signer);
  return await encryptData(key, gameData);
};

/**
 * Convenience function to decrypt game progress with user's wallet
 * @param {ethers.Signer} signer - User's wallet signer
 * @param {string} encryptedData - Encrypted data as hex string
 * @returns {Promise<Object>} - Decrypted game data
 */
export const decryptGameProgress = async (signer, encryptedData) => {
  const key = await generateEncryptionKey(signer);
  return await decryptData(key, encryptedData);
}; 