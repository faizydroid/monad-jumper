import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle, FaCalendarCheck, FaFire } from 'react-icons/fa';
import { useAccount, useWalletClient, usePublicClient, useSignMessage } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import { createClient } from '@supabase/supabase-js';
import { format, differenceInHours, getDaysInMonth, startOfMonth, getDay, addDays } from 'date-fns';

// Add debug logging for environment variables
const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;

// Log variables for debugging (remove in production)
console.log("Supabase URL:", supabaseUrl ? "✅ Loaded" : "❌ Missing");
console.log("Supabase Key:", supabaseAnonKey ? "✅ Loaded" : "❌ Missing");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DailyQuestContent = ({ onClose }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { totalJumps, updateTotalJumps, fetchPlayerStats } = useWeb3();
  const { signMessageAsync } = useSignMessage();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkedDays, setCheckedDays] = useState([]);
  const [checkInState, setCheckInState] = useState({
    lastCheckIn: null,
    currentStreak: 0,
    todayReward: 0,
    canCheckIn: false,
    isLoading: true,
    error: null,
    txPending: false,
    txSuccess: false
  });
  
  // Contract details for the check-in
  const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
  const contractAbi = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_jumps",
          "type": "uint256"
        }
      ],
      "name": "recordJumps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  // Fetch user's check-in data from Supabase
  const fetchCheckInData = async () => {
    if (!address) return;
    
    try {
      setCheckInState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to get the user's check-in streak from localStorage if table doesn't exist
      const today = new Date().toISOString().split('T')[0];
      let currentStreak = 0;
      let lastCheckIn = null;
      let checkedToday = false;
      let breakInStreak = false;
      
      // Find all check-in entries in localStorage
      const checkInDates = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`checkin_${address.toLowerCase()}`)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const checkDate = new Date(data.checked_at);
            checkInDates.push({date: checkDate, key: key});
            
            if (!lastCheckIn || checkDate > new Date(lastCheckIn)) {
              lastCheckIn = data.checked_at;
            }
            
            // Check if already checked in today
            if (key.includes(today)) {
              checkedToday = true;
            }
          } catch (e) {
            console.error("Error parsing localStorage check-in data:", e);
          }
        }
      }
      
      // Sort dates chronologically
      checkInDates.sort((a, b) => a.date - b.date);
      
      // Check for consecutive days to determine current streak
      if (checkInDates.length > 0) {
        // Start with the most recent check-in
        currentStreak = 1;
        
        // If checked in today, start from yesterday; otherwise from today
        const startDate = checkedToday 
          ? new Date(new Date().setDate(new Date().getDate() - 1)) 
          : new Date();
        
        startDate.setHours(0, 0, 0, 0);
        
        // Check backwards from the start date
        for (let i = 1; i <= 30; i++) {
          const checkDate = new Date(startDate);
          checkDate.setDate(startDate.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          // Look for this date in our check-in records
          const found = checkInDates.some(entry => 
            entry.key.includes(dateStr)
          );
          
          if (found) {
            currentStreak++;
          } else {
            // Break in streak detected
            breakInStreak = true;
            break;
          }
        }
        
        // If we found a break in the streak and it's not just that today hasn't been checked yet
        if (breakInStreak && !(!checkedToday && currentStreak === 1)) {
          // Reset streak to 0 if there was a missed day
          currentStreak = 0;
        }
      }
      
      // Get current month data for calendar
      const currentMonthStr = currentMonth.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      const checkedDaysArray = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`checkin_${address.toLowerCase()}`)) {
          try {
            // Extract date from key (format: checkin_0x123_2025-04-17)
            const dateStr = key.split('_')[2];
            if (dateStr && dateStr.startsWith(currentMonthStr)) {
              const day = parseInt(dateStr.split('-')[2]);
              checkedDaysArray.push(day);
            }
          } catch (e) {
            console.error("Error parsing date from localStorage key:", e);
          }
        }
      }
      
      setCheckedDays(checkedDaysArray);
      
      // Calculate if user can check in today
      const canCheckIn = !checkedToday;
      const todayReward = calculateJumpsReward(currentStreak + 1);
      
      setCheckInState({
        lastCheckIn: lastCheckIn ? new Date(lastCheckIn) : null,
        currentStreak,
        todayReward,
        canCheckIn,
        isLoading: false,
        error: null,
        txPending: false,
        txSuccess: false
      });
    } catch (error) {
      console.error('Error fetching check-in data:', error);
      setCheckInState(prev => ({
        ...prev, 
        isLoading: false,
        error: 'Failed to load check-in data'
      }));
    }
  };

  // Calculate jumps based on streak
  const calculateJumpsReward = (streak) => {
    // If streak is 0 (missed days) or 1 (first day), return base value of 10
    if (streak <= 1) {
      return 10;
    }
    
    // Base value is 10 times day number
    let baseReward = streak * 10;
    
    // Check if it's a 7th day (any multiple of 7)
    if (streak % 7 === 0) {
      // Apply 2x bonus on 7th days (7th, 14th, 21st, etc.)
      baseReward *= 2;
    }
    
    // First week: Day 1: 10, Day 2: 20, Day 3: 30, ... Day 7: 70 (with 2x = 140)
    if (streak <= 7) {
      return baseReward;
    } 
    // Second week and beyond: keep same pattern but double the rewards
    else {
      const weekNumber = Math.floor((streak - 1) / 7) + 1;
      const dayInWeek = (streak - 1) % 7 + 1;
      
      // If it's not a 7th day (already handled above)
      if (dayInWeek !== 7) {
        // Apply week multiplier
        baseReward = (dayInWeek * 10) * Math.pow(2, weekNumber - 1);
      }
      
      return baseReward;
    }
  };

  // Generate calendar for current month
  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth));
    const today = new Date().getDate();
    const currentMonthValue = new Date().getMonth();
    const currentYearValue = new Date().getFullYear();
    const isCurrentMonth = 
      currentMonth.getMonth() === currentMonthValue && 
      currentMonth.getFullYear() === currentYearValue;
    
    const days = [];
    
    // Add empty cells for days before start of month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Sort checked days chronologically
    const sortedCheckedDays = [...checkedDays].sort((a, b) => a - b);
    
    // Find the first day the user checked in to establish streak start
    let streakStartDay = 0;
    let streakLength = checkInState.currentStreak;
    
    // For current month, calculate where the streak starts
    if (isCurrentMonth && sortedCheckedDays.length > 0) {
      // If the streak starts in the current month
      if (streakLength <= sortedCheckedDays.length) {
        // Start day is calculated from the most recent check-ins
        streakStartDay = sortedCheckedDays[sortedCheckedDays.length - streakLength];
      }
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today;
      const isCheckedIn = checkedDays.includes(day);
      const isPast = isCurrentMonth && day < today;
      const isFuture = isCurrentMonth && day > today;
      
      // Calculate streak position for this day
      let streakDay = 0;
      
      if (isCheckedIn) {
        // If this day is checked, get its exact position in the streak
        const chronologicalPosition = sortedCheckedDays.indexOf(day) + 1;
        streakDay = chronologicalPosition;
      } else if (isFuture) {
        // For future days, calculate forward from current streak
        // The streak day would be the current streak + days from today
        streakDay = streakLength + (day - today);
        
        // If user hasn't checked in today but can, adjust
        if (isCurrentMonth && checkInState.canCheckIn) {
          streakDay += 1;
        }
        
        // If this is today and user can check in, it would be the next streak day
        if (isToday && checkInState.canCheckIn) {
          streakDay = streakLength + 1;
        }
      }
      
      // Calculate jumps reward for this day
      const jumpsReward = streakDay > 0 ? calculateJumpsReward(streakDay) : 0;
      
      days.push(
        <div 
          key={`day-${day}`}
          className={`calendar-day ${isToday ? 'today' : ''} ${isCheckedIn ? 'checked' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
        >
          <div className="day-number">{day}</div>
          {isCheckedIn && <div className="check-mark">✓</div>}
          {isToday && !isCheckedIn && checkInState.canCheckIn && (
            <div className="today-marker"></div>
          )}
          {jumpsReward > 0 && (
            <div className="day-jumps-reward">
              +{jumpsReward}
              {streakDay % 7 === 0 && <span className="bonus-tag">2X!</span>}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  // Perform daily check-in with wallet signature
  const performCheckIn = async () => {
    if (!address || !walletClient || checkInState.txPending || !checkInState.canCheckIn) {
      return;
    }
    
    try {
      setCheckInState(prev => ({ ...prev, txPending: true, error: null }));
      
      const newStreak = checkInState.currentStreak + 1;
      const jumpsToAdd = checkInState.todayReward;
      const timestamp = new Date().toISOString();
      
      // Update UI immediately to show the new jump count
      const updatedTotal = (totalJumps || 0) + jumpsToAdd;
      
      // Check if updateTotalJumps is a function before calling it
      if (typeof updateTotalJumps === 'function') {
        updateTotalJumps(updatedTotal);
      } else {
        console.log(`Updated jump count to: ${updatedTotal} (UI update only)`);
        // Continue without updating state if the function isn't available
      }
      
      // Continue with the blockchain transaction...
      const message = `I am checking in to JumpNads on ${timestamp}. Current streak: ${checkInState.currentStreak}, Reward: ${jumpsToAdd} jumps.`;
      const signature = await signMessageAsync({ message });
      
      // Record on blockchain
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'recordJumps',
        args: [BigInt(jumpsToAdd)]
      });
      
      // 3. Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Check-in confirmed in block: ${receipt.blockNumber}`);
      
      // 4. Try to update jumps table first - this is the critical part
      try {
        // Update user's total jumps in Supabase
        const { data: existingJumps, error: jumpsFetchError } = await supabase
          .from('jumps')
          .select('count')
          .eq('wallet_address', address.toLowerCase())
          .maybeSingle();
          
        if (jumpsFetchError) {
          console.error("Error fetching existing jumps:", jumpsFetchError);
        }
        
        // Calculate new total
        let newTotal = updatedTotal;
        if (existingJumps && existingJumps.count !== null) {
          newTotal = parseInt(existingJumps.count) + jumpsToAdd;
        }
        
        // Create the jump data object
        const jumpData = {
          wallet_address: address.toLowerCase(),
          count: newTotal || jumpsToAdd
        };
        
        // Add the session token if available for API validation
        if (window.__SECURE_GAME_TOKEN && !window.__SECURE_GAME_TOKEN.used) {
          jumpData.session_token = window.__SECURE_GAME_TOKEN.value;
        }
        
        // If record exists, update it
        if (existingJumps) {
          const { error: updateError } = await supabase
            .from('jumps')
            .update(jumpData)
            .eq('wallet_address', address.toLowerCase());
            
          if (updateError) {
            console.error("Error updating jumps:", updateError);
          } else {
            console.log(`Updated jump count to: ${newTotal}`);
          }
        } 
        // If no record, insert new one
        else {
          const { error: insertError } = await supabase
            .from('jumps')
            .insert(jumpData);
            
          if (insertError) {
            console.error("Error inserting jumps:", insertError);
          } else {
            console.log(`Inserted new jump record with count: ${jumpsToAdd}`);
          }
        }
        
        // Mark token as used
        if (window.__SECURE_GAME_TOKEN) {
          window.__SECURE_GAME_TOKEN.used = true;
        }
        
        // Call fetchPlayerStats to update the UI
        fetchPlayerStats();
        
      } catch (jumpsError) {
        console.error("Error updating jumps table:", jumpsError);
        // Continue with the check-in process even if jumps update fails
      }
      
      // 5. Try to record in checkins table - store using localStorage if this fails
      try {
        // Store check-in data in localStorage as backup
        const checkInData = {
          wallet_address: address.toLowerCase(),
          streak: newStreak,
          jumps_earned: jumpsToAdd,
          checked_at: timestamp,
          tx_hash: hash,
          signature: signature,
          message: message
        };
        
        // Save to localStorage first as backup
        const storageKey = `checkin_${address.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(storageKey, JSON.stringify(checkInData));
        
        // Try to insert into Supabase
        const { error } = await supabase
          .from('checkins')
          .insert(checkInData);
          
        if (error) {
          console.error("Error recording check-in:", error);
          // If table doesn't exist, we'll just use localStorage 
          // and show a message that streak tracking will be added in a future update
        }
      } catch (checkInError) {
        console.error("Error recording check-in details:", checkInError);
        // This is non-critical, so just log the error
      }
      
      // Update component state
      setCheckInState(prev => ({
        ...prev,
        lastCheckIn: new Date(),
        currentStreak: newStreak,
        todayReward: calculateJumpsReward(newStreak + 1),
        canCheckIn: false,
        txPending: false,
        txSuccess: true
      }));
      
      // Update checked days in calendar
      setCheckedDays(prev => [...prev, new Date().getDate()]);
      
      // Show success message
      setTimeout(() => {
        setCheckInState(prev => ({ ...prev, txSuccess: false }));
      }, 3000);
      
    } catch (error) {
      console.error('Error during check-in:', error);
      // Revert the jump count update if the transaction failed
      if (typeof updateTotalJumps === 'function') {
        updateTotalJumps(totalJumps);
      }
      setCheckInState(prev => ({
        ...prev,
        txPending: false,
        error: 'Check-in failed. Please try again.'
      }));
    }
  };

  // Functions to navigate between months
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Load check-in data on component mount or when month changes
  useEffect(() => {
    if (address) {
      fetchCheckInData();
    }
  }, [address, currentMonth]);

  // Replace the existing daily quests list with this code
  const [weeklyQuests, setWeeklyQuests] = useState({
    lastReset: null,
    gamesPlayed: 0,
    highScore: 0,
    claimed: {
      games: [false, false, false, false, false, false],
      score: [false, false, false, false, false, false]
    }
  });

  // Define quest thresholds and rewards
  const gameQuests = [
    { threshold: 10, reward: 20 },
    { threshold: 30, reward: 50 },
    { threshold: 50, reward: 100 },
    { threshold: 100, reward: 200 },
    { threshold: 200, reward: 500 },
    { threshold: 500, reward: 2000 },
    { threshold: 1000, reward: 5000 }
  ];

  // Add this after other state declarations
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Add txPending state for claim buttons
  const [claimingIndex, setClaimingIndex] = useState(null);

  // Add function to fetch weekly quests progress
  const fetchWeeklyQuests = async () => {
    if (!address || !supabase) return;
    
    try {
      // Get weekly quests data
      const { data, error } = await supabase
        .from('weekly_quests')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching weekly quests:", error);
        return;
      }
      
      // Get current games count
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
        
      if (gamesError && gamesError.code !== 'PGRST116') {
        console.error("Error fetching games count:", gamesError);
      }
      
      const totalGamesPlayed = gamesData?.count || 0;
      
      // Check if we need to reset (if it's been more than 7 days)
      const now = new Date();
      const resetNeeded = data?.last_reset 
        ? now - new Date(data.last_reset) > 7 * 24 * 60 * 60 * 1000 
        : true;
      
      if (resetNeeded) {
        try {
          // Store the last total games count for offset calculation
          const lastTotalGames = data?.last_total_games || 0;
          
          // Reset weekly data
          const newData = {
            wallet_address: address.toLowerCase(),
            last_reset: now.toISOString(),
            games_played: totalGamesPlayed, // Use total games as the current week's progress
            high_score: 0,
            claimed_games: [false, false, false, false, false, false, false],
            claimed_score: [false, false, false, false, false, false],
            last_total_games: 0 // Start from 0 to count all existing games
          };
          
          // Upsert the data (update or insert)
          const { error: upsertError } = await supabase
            .from('weekly_quests')
            .upsert(newData);
            
          if (upsertError) {
            console.error("Error resetting weekly quests:", upsertError);
            // Continue with local state update even if Supabase update fails
          }
          
          setWeeklyQuests({
            lastReset: now.toISOString(),
            gamesPlayed: totalGamesPlayed, // Use total games as current progress
            highScore: 0,
            lastTotalGames: 0, // Reset baseline to 0
            claimed: {
              games: [false, false, false, false, false, false, false],
              score: [false, false, false, false, false, false]
            }
          });
        } catch (resetError) {
          console.error("Failed to reset weekly quests:", resetError);
          // Fallback: Continue with basic functionality
        }
      } else if (data) {
        // Use the total games played as the progress for this week
        const gamesPlayedSinceReset = totalGamesPlayed;
        
        // Use existing data but update games played count
        setWeeklyQuests({
          lastReset: data.last_reset,
          gamesPlayed: gamesPlayedSinceReset,
          highScore: data.high_score || 0,
          lastTotalGames: data.last_total_games || 0,
          claimed: {
            games: data.claimed_games || [false, false, false, false, false, false, false],
            score: data.claimed_score || [false, false, false, false, false, false]
          }
        });
        
        // Update the games played count in Supabase if it's changed
        if (gamesPlayedSinceReset !== data.games_played) {
          const { error: updateError } = await supabase
            .from('weekly_quests')
            .update({ games_played: gamesPlayedSinceReset })
            .eq('wallet_address', address.toLowerCase());
            
          if (updateError) {
            console.error("Error updating games played count:", updateError);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchWeeklyQuests:", error);
    }
  };

  // Add useEffect to load weekly quests on mount
  useEffect(() => {
    if (address) {
      fetchWeeklyQuests();
    }
  }, [address]);

  // Update claimQuestReward to include blockchain transaction
  const claimQuestReward = async (type, index) => {
    if (!address || !walletClient || !supabase || claimingIndex !== null) return;
    
    try {
      setClaimingIndex(index);
      console.log("Starting claim process for", type, "quest #", index);
      
      // Get current data
      const { data, error } = await supabase
        .from('weekly_quests')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching quest data for claim:", error);
        setClaimingIndex(null);
        return;
      }
      
      // Calculate reward
      const reward = gameQuests[index].reward;
      console.log("Reward amount:", reward);
      
      // 1. Execute blockchain transaction first
      const timestamp = new Date().toISOString();
      const message = `Claiming weekly quest reward of ${reward} jumps for playing ${gameQuests[index].threshold} games on ${timestamp}`;
      
      // Sign message for verification
      const signature = await signMessageAsync({ message });
      
      // Record jumps on blockchain
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'recordJumps',
        args: [BigInt(reward)]
      });
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Claim confirmed in block: ${receipt.blockNumber}`);
      
      // 2. Update claimed status in database
      const newClaimedGames = data?.claimed_games || Array(gameQuests.length).fill(false);
      newClaimedGames[index] = true;
      
      const { error: updateError } = await supabase
        .from('weekly_quests')
        .update({
          claimed_games: newClaimedGames
        })
        .eq('wallet_address', address.toLowerCase());
      
      if (updateError) {
        console.error("Error updating claimed status:", updateError);
        setClaimingIndex(null);
        return;
      }
      
      // 3. Update jumps in database
      const { data: existingJumps, error: jumpsFetchError } = await supabase
        .from('jumps')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
        
      // Calculate new total
      let newTotal = existingJumps?.count ? parseInt(existingJumps.count) + reward : reward;
      
      // Update or insert jumps
      if (existingJumps) {
        await supabase
          .from('jumps')
          .update({ count: newTotal })
          .eq('wallet_address', address.toLowerCase());
      } else {
        await supabase
          .from('jumps')
          .insert({
            wallet_address: address.toLowerCase(),
            count: reward
          });
      }
      
      // 4. Update UI state
      if (typeof updateTotalJumps === 'function') {
        updateTotalJumps(newTotal);
      }
      
      // Update local state
      setWeeklyQuests(prev => {
        const newClaimed = {
          games: [...prev.claimed.games],
          score: [...prev.claimed.score]
        };
        
        newClaimed.games[index] = true;
        return { ...prev, claimed: newClaimed };
      });
      
      // Update player stats UI
      fetchPlayerStats();
      
      // Show success message
      setClaimSuccess(true);
      setTimeout(() => {
        setClaimSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error("Error claiming reward:", error);
    } finally {
      setClaimingIndex(null);
    }
  };

  return (
    <div className="daily-quest-content" style={{
      overflow: 'hidden',
      position: 'relative',
      height: '100%',
      maxHeight: '100vh',
      margin: 0,
      padding: 0,
      width: '100%',
      background: '#222', // Dark background to match overlay
      color: 'white'
    }}>
      <div className="coming-soon-overlay" style={{
        position: 'absolute',
        top: '0', // Cover from the very top
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        pointerEvents: 'auto'
      }}>
        <div className="coming-soon-message" style={{
          fontFamily: 'Bangers, cursive',
          fontSize: '3rem',
          color: 'white',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
          transform: 'rotate(-5deg)',
          border: '3px solid white',
          padding: '15px 30px',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
        }}>COMING SOON</div>
      </div>
      
      <button className="panel-close-button" onClick={onClose} style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 10002,
        pointerEvents: 'auto',
        background: 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '20px'
      }}>
        <FaTimes />
      </button>
      
      {/* Daily Claim title centered above calendar */}
      <h2 className="section-title daily-claim-title bangers-font" style={{
        position: 'relative',
        zIndex: 100, // Lower z-index to be under the overlay
        marginTop: '10px'
      }}>Daily Claim</h2>
      
      <div className="main-content-wrapper" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        flexWrap: 'wrap',
        background: 'transparent'
      }}>
        {/* Calendar UI */}
        <div className="calendar-container" style={{
          flex: '1 1 300px',
          minWidth: '280px',
          background: 'transparent'
        }}>
          <div className="calendar-header">
            <button onClick={prevMonth} className="month-nav">&lt;</button>
            <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={nextMonth} className="month-nav">&gt;</button>
          </div>
          
          <div className="calendar-weekdays">
            <div>M</div>
            <div>T</div>
            <div>W</div>
            <div>T</div>
            <div>F</div>
            <div>S</div>
            <div>S</div>
          </div>
          
          <div className="calendar-days">
            {generateCalendar()}
          </div>
        </div>
        
        {/* Right column with cards stacked vertically */}
        <div className="daily-quest-sidebar" style={{
          flex: '1 1 300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {/* Jumps Stats Card */}
          <div className="jumps-stats-card" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '180px', /* Control total height */
            padding: '10px',
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="jumps-card-header" style={{marginBottom: '5px'}}>
              <h3 style={{margin: '0 0 8px 0', fontFamily: 'Bangers', fontSize: '1.8rem', textAlign: 'center'}}>
                TOTAL JUMPS
              </h3>
            </div>
            
            <div style={{flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              <div className="jumps-counter" style={{margin: '0'}}>
                <span className="jumps-value" style={{fontFamily: 'Bangers', fontSize: '3rem'}}>
                  {totalJumps || 0}
                </span>
              </div>
              
              <div style={{
                fontSize: '0.9rem',
                textAlign: 'center',
                marginTop: '5px',
                lineHeight: '1.2'
              }}>
                Collect jumps by playing games and checking in daily!
              </div>
            </div>
          </div>
          
          {/* Streak and Check-in UI */}
          <div className="daily-check-in-card" style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '12px',
            padding: '15px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
          }}>
            {checkInState.isLoading ? (
              <div className="check-in-loading">Loading your check-in status...</div>
            ) : (
              <>
                <div className="check-in-details">
                  {checkInState.currentStreak > 0 && (
                    <div className="streak-display">
                      <FaFire color="#FF6B6B" size={24} />
                      <span>{checkInState.currentStreak} day streak!</span>
                    </div>
                  )}
                  
                  {checkInState.canCheckIn ? (
                    <div className="today-reward">
                      <h4>Today's reward:</h4>
                      <div className="jumps-reward">+{checkInState.todayReward} JUMPS</div>
                    </div>
                  ) : (
                    <div className="next-reward">
                      <h4>Next reward:</h4>
                      <div className="jumps-reward next">+{calculateJumpsReward(checkInState.currentStreak + 1)} JUMPS</div>
                    </div>
                  )}
                </div>
                
                <button 
                  className={`check-in-button ${!checkInState.canCheckIn ? 'disabled' : ''}`}
                  onClick={performCheckIn}
                  disabled={!checkInState.canCheckIn || checkInState.txPending}
                  style={{ position: 'relative', zIndex: 100, pointerEvents: 'auto' }}
                >
                  {checkInState.txPending ? (
                    <div className="loading-spinner"></div>
                  ) : checkInState.canCheckIn ? (
                    'SIGN & CHECK IN'
                  ) : (
                    'ALREADY CHECKED IN TODAY'
                  )}
                </button>
                
                {checkInState.txSuccess && (
                  <div className="success-message">
                    <FaCheckCircle color="green" />
                    Check-in successful! You earned {checkInState.todayReward} jumps!
                  </div>
                )}
                
                {checkInState.error && (
                  <div className="error-message">{checkInState.error}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Weekly Quests title centered */}
      <h2 className="section-title weekly-quest-title" style={{marginBottom: '0', paddingBottom: '0'}}>Weekly Quests</h2>

      <div className="quests-reset-info" style={{margin: '0', padding: '0', fontSize: '0.8rem', lineHeight: '1'}}>
        Resets in {weeklyQuests.lastReset ? 
        Math.ceil(7 - (new Date() - new Date(weeklyQuests.lastReset)) / (24 * 60 * 60 * 1000)) : 7} days
      </div>

      {claimSuccess && (
        <div className="claim-success-message" style={{margin: '5px 0'}}>
          <FaCheckCircle color="green" />
          Reward claimed! It might take some time for jumps to update.
        </div>
      )}

      <div className="daily-quests-list" style={{
        marginTop: '5px', 
        paddingTop: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <h3 style={{marginTop: '0', paddingTop: '5px'}}>Games Played Quests</h3>
        {gameQuests.map((quest, index) => {
          const progress = Math.min(weeklyQuests.gamesPlayed, quest.threshold);
          const progressPercent = Math.floor((progress / quest.threshold) * 100);
          const isCompleted = weeklyQuests.gamesPlayed >= quest.threshold;
          const isClaimed = weeklyQuests.claimed.games[index];
          
          return (
            <div className="quest-item" key={`game-${index}`} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '12px',
              padding: '15px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              gap: '15px',
              flexWrap: 'wrap'
            }}>
              <div className="quest-icon" style={{
                fontSize: '24px',
                minWidth: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
              }}>🎮</div>
              <div className="quest-info" style={{
                flex: '1 1 180px',
                minWidth: '0'
              }}>
                <div className="quest-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '5px',
                  flexWrap: 'wrap'
                }}>
                  <h3 style={{margin: '0', fontSize: '1rem'}}>Play {quest.threshold} Games</h3>
                  <div className="quest-reward-badge" style={{
                    background: '#FFD700',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    <span className="reward-amount">+{quest.reward}</span>
                  </div>
                </div>
                <div className="progress-bar" style={{
                  height: '8px',
                  background: '#eee',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  margin: '8px 0'
                }}>
                  <div className="progress" style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(to right, #4ECDC4, #556270)',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div className="quest-progress" style={{
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {progress}/{quest.threshold} games
                  {isCompleted && !isClaimed && <span className="quest-completed" style={{color: 'green'}}>✓</span>}
                  {isClaimed && <span className="quest-claimed" style={{fontSize: '0.8rem', color: '#666'}}>Claimed</span>}
                </div>
              </div>
              <button 
                className="claim-button" 
                disabled={!isCompleted || isClaimed || claimingIndex !== null}
                onClick={() => claimQuestReward('games', index)}
                style={{
                  background: isCompleted && !isClaimed ? '#4ECDC4' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 15px',
                  fontWeight: 'bold',
                  cursor: isCompleted && !isClaimed ? 'pointer' : 'not-allowed',
                  minWidth: '80px',
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 100,
                  pointerEvents: 'auto'
                }}
              >
                {isClaimed ? 'Claimed' : 
                 claimingIndex === index ? (
                   <div className="loading-spinner"></div>
                 ) : 'Claim'}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Add mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .main-content-wrapper {
            flex-direction: column;
          }
          
          .calendar-container {
            min-width: 100%;
          }
          
          .daily-quest-sidebar {
            min-width: 100%;
          }
          
          .calendar-days {
            font-size: 0.9rem;
          }
          
          .quest-item {
            padding: 10px;
          }
          
          .section-title {
            font-size: 1.8rem;
          }
          
          .panel-close-button {
            top: 10px;
            right: 10px;
          }
        }
        
        @media (max-width: 480px) {
          .calendar-weekdays div, 
          .calendar-day {
            font-size: 0.8rem;
          }
          
          .quest-item {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .quest-icon {
            margin-bottom: 8px;
          }
          
          .claim-button {
            align-self: stretch;
            margin-top: 10px;
            width: 100%;
          }
          
          .jumps-value {
            font-size: 2.5rem !important;
          }
          
          .section-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DailyQuestContent; 