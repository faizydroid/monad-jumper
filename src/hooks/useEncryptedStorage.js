import { useState, useEffect, useCallback } from 'react';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { EncryptedStorageService } from '../services/EncryptedStorageService';
import { CONTRACT_ADDRESSES } from '../contracts/config';

/**
 * Hook for interacting with encrypted on-chain storage
 * @returns {Object} Storage functions and state
 */
export function useEncryptedStorage() {
  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [storageService, setStorageService] = useState(null);
  const [hasStoredData, setHasStoredData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize the storage service when provider or contract address changes
  useEffect(() => {
    if (!provider || !isConnected) return;
    
    try {
      const service = new EncryptedStorageService(provider, CONTRACT_ADDRESSES.ENCRYPTED_STORAGE);
      setStorageService(service);
      
      // Check if the user has data stored
      if (address) {
        setIsLoading(true);
        service.hasData(address)
          .then(hasData => {
            setHasStoredData(hasData);
            setIsLoading(false);
          })
          .catch(err => {
            console.error('Error checking for stored data:', err);
            setError('Failed to check if you have stored data');
            setIsLoading(false);
          });
      }
    } catch (err) {
      console.error('Error initializing storage service:', err);
      setError('Failed to initialize encrypted storage');
    }
  }, [provider, address, isConnected]);

  /**
   * Save encrypted game data to the blockchain
   * @param {Object} gameData - Game data to encrypt and store
   * @param {string} metadata - Optional public metadata
   * @returns {Promise<Object>} - Transaction result
   */
  const saveData = useCallback(async (gameData, metadata = '') => {
    if (!storageService || !isConnected) {
      throw new Error('Storage service not initialized or wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await storageService.saveProgress(gameData, metadata);
      if (result.success) {
        setHasStoredData(true);
      }
      setIsLoading(false);
      return result;
    } catch (err) {
      setError('Failed to save encrypted data: ' + err.message);
      setIsLoading(false);
      throw err;
    }
  }, [storageService, isConnected]);

  /**
   * Load encrypted game data from the blockchain
   * @returns {Promise<Object>} - Decrypted game data
   */
  const loadData = useCallback(async () => {
    if (!storageService || !isConnected) {
      throw new Error('Storage service not initialized or wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await storageService.loadProgress();
      setIsLoading(false);
      return data;
    } catch (err) {
      setError('Failed to load encrypted data: ' + err.message);
      setIsLoading(false);
      throw err;
    }
  }, [storageService, isConnected]);

  /**
   * Delete encrypted game data from the blockchain
   * @returns {Promise<boolean>} - Success status
   */
  const deleteData = useCallback(async () => {
    if (!storageService || !isConnected) {
      throw new Error('Storage service not initialized or wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await storageService.deleteProgress();
      if (success) {
        setHasStoredData(false);
      }
      setIsLoading(false);
      return success;
    } catch (err) {
      setError('Failed to delete encrypted data: ' + err.message);
      setIsLoading(false);
      throw err;
    }
  }, [storageService, isConnected]);

  return {
    saveData,
    loadData,
    deleteData,
    hasStoredData,
    isLoading,
    error,
    isReady: !!storageService && isConnected
  };
} 