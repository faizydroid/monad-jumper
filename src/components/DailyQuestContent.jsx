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

  // Calculate jumps based on streak
  const calculateJumpsReward = (streak) => {
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
      
      // Find all check-in entries in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`checkin_${address.toLowerCase()}`)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const checkDate = new Date(data.checked_at);
            
            if (!lastCheckIn || checkDate > new Date(lastCheckIn)) {
              lastCheckIn = data.checked_at;
              currentStreak = data.streak;
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
        
        // If record exists, update it
        if (existingJumps) {
          const { error: updateError } = await supabase
            .from('jumps')
            .update({ count: newTotal })
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
            .insert({
              wallet_address: address.toLowerCase(),
              count: jumpsToAdd
            });
            
          if (insertError) {
            console.error("Error inserting jumps:", insertError);
          } else {
            console.log(`Inserted new jump record with count: ${jumpsToAdd}`);
          }
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
            games_played: Math.max(0, totalGamesPlayed - lastTotalGames),
            high_score: 0,
            claimed_games: [false, false, false, false, false, false, false],
            claimed_score: [false, false, false, false, false, false],
            last_total_games: totalGamesPlayed
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
            gamesPlayed: Math.max(0, totalGamesPlayed - lastTotalGames),
            highScore: 0,
            lastTotalGames: totalGamesPlayed,
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
        // Calculate games played since last reset
        const gamesPlayedSinceReset = Math.max(0, totalGamesPlayed - (data.last_total_games || 0));
        
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
    <div className="daily-quest-content">
      <button className="panel-close-button" onClick={onClose}>
        <FaTimes />
      </button>
      
      {/* Daily Claim title centered above calendar */}
      <h2 className="section-title daily-claim-title">Daily Claim</h2>
      
      <div className="main-content-wrapper">
        {/* Calendar UI */}
        <div className="calendar-container">
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
        <div className="daily-quest-sidebar">
          {/* Jumps Stats Card */}
          <div className="jumps-stats-card" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '180px', /* Control total height */
            padding: '10px',
            position: 'relative'
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
          <div className="daily-check-in-card">
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

      <div className="daily-quests-list" style={{marginTop: '5px', paddingTop: '0'}}>
        <h3 style={{marginTop: '0', paddingTop: '5px'}}>Games Played Quests</h3>
        {gameQuests.map((quest, index) => {
          const progress = Math.min(weeklyQuests.gamesPlayed, quest.threshold);
          const progressPercent = Math.floor((progress / quest.threshold) * 100);
          const isCompleted = weeklyQuests.gamesPlayed >= quest.threshold;
          const isClaimed = weeklyQuests.claimed.games[index];
          
          return (
            <div className="quest-item" key={`game-${index}`}>
              <div className="quest-icon">🎮</div>
              <div className="quest-info">
                <div className="quest-header">
                  <h3>Play {quest.threshold} Games</h3>
                  <div className="quest-reward-badge">
                    <span className="jumps-icon">🦘</span>
                    <span className="reward-amount">+{quest.reward}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress" style={{width: `${progressPercent}%`}}></div>
                </div>
                <div className="quest-progress">
                  {progress}/{quest.threshold} games
                  {isCompleted && !isClaimed && <span className="quest-completed">✓</span>}
                  {isClaimed && <span className="quest-claimed">Claimed</span>}
                </div>
              </div>
              <button 
                className="claim-button" 
                disabled={!isCompleted || isClaimed || claimingIndex !== null}
                onClick={() => claimQuestReward('games', index)}
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
    </div>
  );
};

export default DailyQuestContent; 