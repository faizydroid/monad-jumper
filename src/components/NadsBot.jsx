import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAccount } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import './NadsBot.css';
import { FaRobot, FaSync } from 'react-icons/fa';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY
);

const NadsBot = ({ gameData, onClose }) => {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const { totalJumps, playerHighScore } = useWeb3();
  
  // Process the game data to generate feedback
  useEffect(() => {
    async function generateFeedback() {
      if (!gameData) return;
      
      try {
        setLoading(true);
        
        // First, save the game session data to Supabase for analytics
        await saveGameSession(gameData);
        
        // Generate AI feedback
        const aiResponse = await generateAIFeedback(gameData);
        
        setFeedback(aiResponse);
      } catch (err) {
        console.error('Error generating NadsBot feedback:', err);
        setError('Could not generate feedback. Try again later.');
        
        // Fallback feedback if AI fails
        setFeedback({
          funnyComment: "That was quite a jump session!",
          advice: "Try to maintain your rhythm between platforms."
        });
      } finally {
        setLoading(false);
      }
    }
    
    generateFeedback();
  }, [gameData, address]);
  
  // Save game session data to Supabase
  const saveGameSession = async (data) => {
    if (!address || !data) return;
    
    const sessionId = `game_${Date.now()}`;
    
    try {
      // Save game session data for analysis
      await supabase.from('game_sessions').insert({
        session_id: sessionId,
        wallet_address: address.toLowerCase(),
        score: data.score || 0,
        jumps: data.jumps || 0,
        death_reason: data.deathReason || 'fall',
        platform_types: data.platformTypes || [],
        session_duration: data.duration || 0,
        timestamp: new Date().toISOString()
      });
      
      console.log('Game session saved for NadsBot analysis');
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  };
  
  // Generate AI feedback based on game data
  const generateAIFeedback = async (data) => {
    // For initial implementation, use pre-defined responses based on game performance
    // In a future update, this would call an actual MCP endpoint
    
    // Calculate metrics
    const jumpEfficiency = data.score / Math.max(1, data.jumps);
    const isHighScore = data.score >= playerHighScore;
    const avgScorePerJump = playerHighScore / Math.max(1, totalJumps);
    
    // Determine pattern-based feedback
    let funnyComment, advice;
    
    // Funny comment based on performance
    if (data.jumps < 10) {
      funnyComment = "That was more of a hop than a jump marathon!";
    } else if (jumpEfficiency < avgScorePerJump * 0.5) {
      funnyComment = "You're jumping a lot, but not getting very high. Reminds me of a hyperactive rabbit!";
    } else if (jumpEfficiency > avgScorePerJump * 1.5) {
      funnyComment = "Wow! Your jumps are super efficient. Are you part kangaroo?";
    } else if (data.deathReason === 'monster') {
      funnyComment = "Those monsters are sneaky, aren't they? Next time try shooting them a dirty look... or just a bullet.";
    } else {
      // Random funny comments for variety
      const comments = [
        "You fell like a graceful meteor... back to earth!",
        "I've seen better jumps from my grandma... and she's a robot!",
        "Your jumping style is unique! That's the polite way of saying 'chaotic'.",
        "Did you just try to high-five the sky? Almost got there!",
        "You're jumping so much I'm getting dizzy watching you!",
      ];
      funnyComment = comments[Math.floor(Math.random() * comments.length)];
    }
    
    // Advice based on performance
    if (data.jumps < 10) {
      advice = "Try to get a rhythm going with your jumps to build momentum.";
    } else if (jumpEfficiency < avgScorePerJump * 0.5) {
      advice = "Focus on upward progress rather than just number of jumps. Aim for the higher platforms.";
    } else if (data.deathReason === 'monster') {
      advice = "Remember to use your weapon! Tap the shoot button when monsters appear.";
    } else if (data.score > 1000) {
      advice = "You're doing great! Try using power-ups to maintain your momentum at higher levels.";
    } else {
      // Random advice for variety
      const adviceList = [
        "Time your jumps carefully to maximize height on each platform.",
        "Keep your eye on upcoming platforms rather than just your character.",
        "The sides of the screen wrap around - use this to your advantage!",
        "Higher platforms tend to appear after reaching certain score thresholds.",
        "Look for patterns in platform placement to plan your route upward.",
      ];
      advice = adviceList[Math.floor(Math.random() * adviceList.length)];
    }
    
    // Return formatted response
    return { funnyComment, advice };
  };
  
  // In a future update, this would be replaced with a real MCP integration
  // using the Anthropic Claude or similar API
  
  return (
    <div className="nadsbot-container">
      <div className="nadsbot-header">
        <div className="nadsbot-icon">
          <FaRobot />
        </div>
        <h3>NadsBot Game Analysis</h3>
      </div>
      
      <div className="nadsbot-content">
        {loading ? (
          <div className="nadsbot-loading">
            <FaSync className="spin" />
            <p>Analyzing your gameplay...</p>
          </div>
        ) : error ? (
          <div className="nadsbot-error">
            <p>{error}</p>
          </div>
        ) : feedback ? (
          <div className="nadsbot-feedback">
            <div className="nadsbot-funny">
              <span>💀</span> {feedback.funnyComment}
            </div>
            <div className="nadsbot-advice">
              <span>🧠</span> {feedback.advice}
            </div>
          </div>
        ) : null}
      </div>
      
      <div className="nadsbot-footer">
        <button onClick={onClose} className="nadsbot-close-btn">
          Got it!
        </button>
      </div>
    </div>
  );
};

export default NadsBot; 