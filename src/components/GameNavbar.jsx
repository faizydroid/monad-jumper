import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import './Navbar.css';

export default function GameNavbar() {
  const { account, username, playerStats, updateScore, pendingJumps, contract, playerHighScore } = useWeb3();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    window.location.hash = '';
    window.location.href = '/';
  };

  const handleRawTest = async () => {
    try {
      if (!window.ethereum) {
        console.error('No Ethereum provider found');
        return;
      }
      
      // Log ABI from the imported contract
      console.log('Imported contract ABI:', contract.abi);
      
      // Use regular Web3Provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      console.log('Using connected wallet:', address);
      
      // Use a minimal hard-coded ABI to ensure it's correct
      const minimumABI = [
        "function saveScore(uint256 _score) external",
        "function saveScoreIncrement(uint256 _increment) external",
        "function purchasePowerUp(string calldata _type) external payable",
        "function continueGame() external payable",
        "function finalizeGame(uint256 _score, uint256 _jumps) external payable",
        "function recordJump() external",
        "function getHighScore(address _player) external view returns (uint256)"
      ];
      
      // Create contract instance with minimal ABI
      const gameContract = new ethers.Contract(
        "0xfc84a3379e2d8bc9d80ab8391991ef091bd02ba6",
        minimumABI,
        signer
      );
      
      // Log available functions to verify
      console.log('Contract interface functions:', Object.keys(gameContract.functions));
      
      // Call saveScore function
      console.log('Calling saveScore with value: 123');
      const tx = await gameContract.saveScore(123, {
        gasLimit: ethers.utils.hexlify(100000),
        gasPrice: ethers.utils.parseUnits('1', 'gwei')
      });
      
      console.log('Transaction sent:', tx.hash);
      alert('Test transaction sent: ' + tx.hash);
    } catch (error) {
      console.error('Contract test failed:', error);
      alert('Test failed: ' + error.message);
    }
  };

  const handleTestTransaction = async () => {
    console.log('Testing transaction with:', {
      score: 100,
      pendingJumps
    });
    
    try {
      const success = await updateScore(100);
      if (success) {
        console.log('Test transaction successful');
      } else {
        console.error('Test transaction failed');
      }
    } catch (error) {
      console.error('Error in test transaction:', error);
    }
  };

  const handleRetryTest = async () => {
    try {
      // Use a different RPC endpoint
      const provider = new ethers.providers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const address = accounts[0];
      
      console.log('Using address:', address);
      
      // Create contract with minimal details
      const gameContract = {
        address: "0xfc84a3379e2d8bc9d80ab8391991ef091bd02ba6",
        abi: [
          {
            "inputs": [{"name": "_score", "type": "uint256"}],
            "name": "saveScore",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      };
      
      // Prepare transaction data
      const txData = {
        from: address,
        to: gameContract.address,
        data: '0x' + ethers.utils.defaultAbiCoder.encode(
          ['uint256'],
          [123]
        ).slice(2),
        gas: '0x30000',
        gasPrice: '0x' + (2 * 10**9).toString(16)
      };
      
      // Send directly via provider
      console.log('Sending raw transaction:', txData);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txData]
      });
      
      console.log('Transaction hash:', txHash);
      alert('Transaction sent: ' + txHash);
    } catch (error) {
      console.error('Retry test failed:', error);
      alert('Retry failed: ' + error.message);
    }
  };

  const handleSimpleTest = async () => {
    try {
      // Simple direct approach
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      
      // Get connected address
      const address = await signer.getAddress();
      console.log('Connected address:', address);
      
      // Create minimal contract
      const contract = new ethers.Contract(
        "0xfc84a3379e2d8bc9d80ab8391991ef091bd02ba6",
        ["function saveScore(uint256 _score)"],
        signer
      );
      
      // Call saveScore
      console.log('Sending test transaction');
      const tx = await contract.saveScore(42);
      console.log('Transaction sent:', tx.hash);
      alert('Transaction sent: ' + tx.hash);
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error.message);
    }
  };

  return (
    <nav className="navbar navbar-game">
      <div className="navbar-container">
        <div className="navbar-info">
          <button 
            onClick={handleHomeClick} 
            className="nav-button home-button"
          >
            <span role="img" aria-label="home">🏠</span>
            Home
          </button>
          
          <div className="high-score">
          <span role="img" aria-label="trophy">🏆</span>
          <span className="score-label">Hi-Score:</span>
          <span className="score-value">{playerHighScore || 0}</span>
        </div>
          
          {account && username && (
            <div className="wallet-info game-mode">
              <div className="username-wrapper">
                <button 
                  className="username-button" 
                  onClick={toggleDropdown}
                >
                  <span role="img" aria-label="user">👤</span> 
                  {username}
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="connect-button-wrapper">
                      <ConnectButton 
                        showBalance={false} 
                        chainStatus="icon"
                        accountStatus="address"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Restore the original high-score UI design but use playerHighScore */}
      
      </div>
    </nav>
  );
} 