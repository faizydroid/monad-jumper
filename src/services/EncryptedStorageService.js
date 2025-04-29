import { ethers } from 'ethers';
import { encryptGameProgress, decryptGameProgress } from '../utils/encryptionUtils';
import { encryptedStorageABI } from '../contracts/encryptedStorageAbi';
import { CONTRACT_ADDRESSES } from '../contracts/config';

/**
 * Encrypted Storage Service
 * Handles interactions with the EncryptedGameStorage contract
 */
export class EncryptedStorageService {
  constructor(provider, contractAddress = CONTRACT_ADDRESSES.ENCRYPTED_STORAGE) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.contract = null;
    this.signer = null;
    
    // Initialize if provider is available
    if (provider) {
      this.initialize();
    }
  }
  
  /**
   * Initialize the contract and signer
   */
  async initialize() {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Get signer from provider
      this.signer = this.provider.getSigner();
      
      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        encryptedStorageABI,
        this.signer
      );
      
      console.log('Encrypted storage service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize encrypted storage service:', error);
      return false;
    }
  }
  
  /**
   * Check if a player has stored data
   * @param {string} address - Player's Ethereum address
   * @returns {Promise<boolean>} - Whether player has data
   */
  async hasData(address) {
    try {
      if (!this.contract) {
        await this.initialize();
      }
      
      return await this.contract.playerHasData(address);
    } catch (error) {
      console.error('Error checking if player has data:', error);
      return false;
    }
  }
  
  /**
   * Save encrypted game progress
   * @param {Object} gameData - Game data to encrypt and store
   * @param {string} metadata - Optional public metadata (leaderboard info, etc.)
   * @returns {Promise<Object>} - Transaction details
   */
  async saveProgress(gameData, metadata = '') {
    try {
      if (!this.contract || !this.signer) {
        await this.initialize();
      }
      
      // Encrypt the game data
      const encryptedData = await encryptGameProgress(this.signer, gameData);
      
      // Send transaction to store data
      const tx = await this.contract.storeData(encryptedData, metadata);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error saving encrypted progress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Load encrypted game progress
   * @returns {Promise<Object>} - Decrypted game data or null
   */
  async loadProgress() {
    try {
      if (!this.contract || !this.signer) {
        await this.initialize();
      }
      
      // Get encrypted data from contract
      const data = await this.contract.getMyData();
      
      // If no data is found or it's empty, return null
      if (!data || !data.encryptedData || data.encryptedData === '') {
        return null;
      }
      
      // Decrypt the data
      const decryptedData = await decryptGameProgress(this.signer, data.encryptedData);
      
      // Add metadata from the blockchain
      return {
        ...decryptedData,
        _metadata: {
          timestamp: new Date(data.timestamp.toNumber() * 1000),
          version: data.version.toNumber(),
          publicData: data.metadata
        }
      };
    } catch (error) {
      console.error('Error loading encrypted progress:', error);
      return null;
    }
  }
  
  /**
   * Delete stored progress
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProgress() {
    try {
      if (!this.contract || !this.signer) {
        await this.initialize();
      }
      
      // Send transaction to delete data
      const tx = await this.contract.deleteMyData();
      await tx.wait();
      
      return true;
    } catch (error) {
      console.error('Error deleting progress:', error);
      return false;
    }
  }
  
  /**
   * Get player data for a specific address
   * Note: This will return encrypted data that only the owner can decrypt
   * @param {string} address - Player's Ethereum address
   * @returns {Promise<Object>} - Raw encrypted data and metadata
   */
  async getPlayerData(address) {
    try {
      if (!this.contract) {
        await this.initialize();
      }
      
      const data = await this.contract.getPlayerData(address);
      
      return {
        encryptedData: data.encryptedData,
        timestamp: new Date(data.timestamp.toNumber() * 1000),
        version: data.version.toNumber(),
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error getting player data:', error);
      return null;
    }
  }
  
  /**
   * Get total player count
   * @returns {Promise<number>} - Number of players with stored data
   */
  async getPlayerCount() {
    try {
      if (!this.contract) {
        await this.initialize();
      }
      
      const count = await this.contract.getPlayerCount();
      return count.toNumber();
    } catch (error) {
      console.error('Error getting player count:', error);
      return 0;
    }
  }
} 