import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAccount } from 'wagmi';
import './TransactionDebugger.css';

const TransactionDebugger = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Get values from context safely
  const web3Context = useWeb3();
  const { saveJumpsToSupabase } = web3Context || {};
  
  // Get account safely
  const account = useAccount();
  const isConnected = account?.isConnected;
  const address = account?.address;
  
  // Initialize the debugger
  useEffect(() => {
    // Add custom logging function to help debug
    const oldConsoleLog = console.log;
    console.log = function() {
      oldConsoleLog.apply(console, arguments);
      
      // Only capture transaction-related logs
      let logText = '';
      for (let i = 0; i < arguments.length; i++) {
        const arg = arguments[i];
        logText += typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        if (i < arguments.length - 1) logText += ' ';
      }
      
      if (logText.includes('transaction') || 
          logText.includes('wallet') || 
          logText.includes('jump') ||
          logText.includes('game')) {
        setLogs(prev => [{
          id: Date.now(),
          text: logText,
          time: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 19)]); // Keep last 20 logs
      }
    };
    
    // Add emergency buttons to force game continuation
    const forceGameContinue = () => {
      try {
        const gameFrame = document.querySelector('iframe');
        if (gameFrame && gameFrame.contentWindow) {
          gameFrame.contentWindow.postMessage({
            type: 'FORCE_CONTINUE'
          }, '*');
          
          // Also try to call the global function
          if (gameFrame.contentWindow.forceGameContinue) {
            gameFrame.contentWindow.forceGameContinue();
          }
        }
      } catch (error) {
        console.error('Error forcing game continuation:', error);
      }
    };
    
    // Expose emergency function globally
    window.forceGameContinue = forceGameContinue;
    
    return () => {
      console.log = oldConsoleLog;
    };
  }, []);
  
  useEffect(() => {
    // Add listener for jump save messages from game
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SAVE_JUMPS') {
        const jumps = event.data.jumps;
        console.log(`📊 Received ${jumps} jumps from game`);
        
        if (isConnected && address && saveJumpsToSupabase) {
          console.log(`📊 Calling saveJumpsToSupabase with address=${address} and jumps=${jumps}`);
          saveJumpsToSupabase(address, jumps);
        } else {
          console.error('📊 Cannot save jumps due to missing requirements:', {
            isConnected: isConnected,
            address: address ? (address.substring(0, 6) + '...') : 'null',
            hasFunction: !!saveJumpsToSupabase
          });
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isConnected, address, saveJumpsToSupabase]);
  
  // Add a debug button to manually trigger jump save
  const triggerJumpSave = () => {
    if (isConnected && address && saveJumpsToSupabase) {
      console.log('📊 Manually triggering jump save with 5 jumps');
      saveJumpsToSupabase(address, 5);
    } else {
      console.error('📊 Cannot manually save jumps: missing requirements');
    }
  };
  
  if (!isOpen) {
    return (
      <button 
        className="debug-toggle-button" 
        onClick={() => setIsOpen(true)}
        title="Debug transaction issues"
      >
        🐞
      </button>
    );
  }
  
  return (
    <div className="transaction-debugger">
      <div className="debugger-header">
        <h3>Transaction Debugger</h3>
        <button onClick={() => setIsOpen(false)}>×</button>
      </div>
      
      <div className="debug-actions">
        <button onClick={() => window.forceGameContinue()}>
          Force Game Continue
        </button>
        <button onClick={triggerJumpSave}>
          Manual Save 5 Jumps
        </button>
      </div>
      
      <div className="debug-logs">
        {logs.map(log => (
          <div key={log.id} className="log-entry">
            <span className="log-time">{log.time}</span>
            <span className="log-text">{log.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionDebugger; 