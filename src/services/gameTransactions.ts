import { ethers } from 'ethers';
import { gameContractABI } from '../contracts/abi';
import { CONTRACT_ADDRESSES } from '../contracts/config';

const GAME_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.GAME_CONTRACT;

export class GameTransactions {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(provider: ethers.providers.Web3Provider) {
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(
      GAME_CONTRACT_ADDRESS,
      gameContractABI,
      this.signer
    );
  }

  async recordJump() {
    try {
      const tx = await this.contract.jump({
        value: ethers.utils.parseEther("0.0001")
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error recording jump:", error);
      throw error;
    }
  }

  async updateScore(score: number) {
    try {
      const tx = await this.contract.updateScore(score);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error updating score:", error);
      throw error;
    }
  }

  async usePowerUp(type: number) {
    try {
      const tx = await this.contract.usePowerUp(type, {
        value: ethers.utils.parseEther("0.0005")
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error using power-up:", error);
      throw error;
    }
  }

  async collectCoin(amount: number) {
    try {
      const tx = await this.contract.collectCoin(amount);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error collecting coin:", error);
      throw error;
    }
  }
} 