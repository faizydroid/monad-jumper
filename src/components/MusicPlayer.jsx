import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useAccount } from 'wagmi';
import './MusicPlayer.css';

// Use global state for shared audio state across components
if (typeof window !== 'undefined' && !window.audioState) {
  window.audioState = {
    isPlaying: false,
    isMuted: false,
    volume: 0.5, // Lower default volume
    frequencyData: [],
    audioElement: null,
    audioContext: null,
    analyser: null,
    source: null,
    isLowPerformanceMode: false, // Add performance mode flag
    lastVisualizationUpdate: 0
  };
}

const MusicPlayer = () => {
  // Use state that syncs with the global state
  const [isPlaying, setIsPlaying] = useState(() => window.audioState?.isPlaying || false);
  const [volume, setVolume] = useState(() => window.audioState?.volume || 0.5);
  const [isMuted, setIsMuted] = useState(() => window.audioState?.isMuted || false);
  const [audioFrequencyData, setAudioFrequencyData] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [isInGameScreen, setIsInGameScreen] = useState(false);
  const [lowPerformanceMode, setLowPerformanceMode] = useState(
    () => window.audioState?.isLowPerformanceMode || false
  );
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playerRef = useRef(null);

  // Check if we're in game screen
  useEffect(() => {
    const checkIfGameScreen = () => {
      const isGameScreen = 
        window.location.hash === '#game' || 
        window.location.pathname.includes('game') ||
        document.getElementById('game-iframe') !== null;
      
      setIsInGameScreen(isGameScreen);
      
      // Automatically enable low performance mode in game screen
      if (isGameScreen && !lowPerformanceMode) {
        setLowPerformanceMode(true);
        window.audioState.isLowPerformanceMode = true;
      }
      
      // Add special class for game screen
      if (playerRef.current) {
        if (isGameScreen) {
          playerRef.current.classList.add('game-screen-player');
          document.body.classList.add('game-screen');
        } else {
          playerRef.current.classList.remove('game-screen-player');
          document.body.classList.remove('game-screen');
        }
      }
    };
    
    checkIfGameScreen();
    
    // Listen for hash changes that might indicate game screen
    window.addEventListener('hashchange', checkIfGameScreen);
    
    return () => {
      window.removeEventListener('hashchange', checkIfGameScreen);
    };
  }, [lowPerformanceMode]);

  // Initialize everything on component mount
  useEffect(() => {
    // Check for existing player
    const existingPlayer = document.querySelector('.music-player');
    if (existingPlayer && existingPlayer !== playerRef.current) {
      setShouldRender(false);
      return;
    }

    // Get or create the audio element
    if (!window.audioState.audioElement) {
      const audioElement = document.createElement('audio');
      audioElement.src = '/sounds/anthem.mp3';
      audioElement.id = 'anthem-audio';
      audioElement.loop = true;
      audioElement.volume = volume;
      audioElement.preload = 'auto'; // Preload audio
      audioElement.setAttribute('playsinline', ''); // Add playsinline for mobile
      
      // Add audio element to DOM
      document.body.appendChild(audioElement);
      window.audioState.audioElement = audioElement;
      
      // Set up audio event listeners
      audioElement.addEventListener('play', () => {
        window.audioState.isPlaying = true;
        setIsPlaying(true);
      });
      
      audioElement.addEventListener('pause', () => {
        window.audioState.isPlaying = false;
        setIsPlaying(false);
      });
    }
    
    // Store reference to the audio element
    audioRef.current = window.audioState.audioElement;
    
    // Set initial play state based on actual audio state
    if (!audioRef.current.paused) {
      setIsPlaying(true);
      window.audioState.isPlaying = true;
    }
    
    // Set up Web Audio API if needed and not in low performance mode
    if (!window.audioState.audioContext && !lowPerformanceMode) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        // Use smaller fftSize to reduce processing overhead
        analyser.fftSize = 64; // Reduced from 128
        analyser.smoothingTimeConstant = 0.5; // Less frequent updates
        
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // Store in global state
        window.audioState.audioContext = audioContext;
        window.audioState.analyser = analyser;
        window.audioState.source = source;
        
        // Store in refs
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (error) {
        console.error('Audio setup error:', error);
        // Fall back to low performance mode on error
        setLowPerformanceMode(true);
        window.audioState.isLowPerformanceMode = true;
      }
    } else if (window.audioState.audioContext && !lowPerformanceMode) {
      // Reuse existing audio context and analyzer
      audioContextRef.current = window.audioState.audioContext;
      analyserRef.current = window.audioState.analyser;
      sourceRef.current = window.audioState.source;
    }
    
    // FPS monitoring to detect performance issues
    let lastFrameTime = performance.now();
    let frameTimes = [];
    
    const monitorFrameRate = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;
      
      // Keep last 60 frame times
      frameTimes.push(frameTime);
      if (frameTimes.length > 60) frameTimes.shift();
      
      // Calculate average FPS
      if (frameTimes.length >= 30) {
        const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;
        
        // If FPS is consistently low, enable low performance mode
        if (fps < 30 && !lowPerformanceMode) {
          console.log('Low FPS detected, enabling low performance mode');
          setLowPerformanceMode(true);
          window.audioState.isLowPerformanceMode = true;
          
          // Disconnect audio processing if possible
          if (audioContextRef.current && analyserRef.current && sourceRef.current) {
            try {
              // Reconnect audio without analyzer
              sourceRef.current.disconnect();
              sourceRef.current.connect(audioContextRef.current.destination);
            } catch (e) {
              console.warn('Failed to simplify audio chain:', e);
            }
          }
        }
      }
      
      requestAnimationFrame(monitorFrameRate);
    };
    
    // Start monitoring after a delay to let the page settle
    const monitorTimer = setTimeout(() => {
      requestAnimationFrame(monitorFrameRate);
    }, 3000);
    
    // Try to play on user interaction
    const playOnInteraction = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => console.warn('Context resume error:', err));
      }
      
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.warn('Autoplay error:', err));
      }
      
      document.removeEventListener('click', playOnInteraction);
      document.removeEventListener('touchstart', playOnInteraction);
      document.removeEventListener('keydown', playOnInteraction);
    };
    
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true });
    document.addEventListener('keydown', playOnInteraction, { once: true });
    
    // Device size detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      clearTimeout(monitorTimer);
      
      // Remove resize listener
      window.removeEventListener('resize', checkMobile);
    };
  }, [lowPerformanceMode, volume]);
  
  // Update visualization in a separate effect - only if not in low performance mode
  useEffect(() => {
    if (!shouldRender || !analyserRef.current || lowPerformanceMode) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateVisualization = () => {
      try {
        // Safety check in case component is unmounting
        if (!analyserRef.current) return;
        
        // Check if we should update based on performance constraints
        const now = performance.now();
        const timeSinceLastUpdate = now - (window.audioState.lastVisualizationUpdate || 0);
        
        // Only update visualization at 15fps (about 66ms per frame)
        // This is a significant reduction from 30fps
        if (timeSinceLastUpdate >= 66) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Update both local and global state
          const newData = [...dataArray];
          setAudioFrequencyData(newData);
          
          // Update global state
          if (window.audioState) {
            window.audioState.frequencyData = newData;
            window.audioState.lastVisualizationUpdate = now;
          }
        }
        
        // Use timeout instead of requestAnimationFrame for more control
        setTimeout(() => {
          if (analyserRef.current && !lowPerformanceMode) {
            animationFrameRef.current = requestAnimationFrame(updateVisualization);
          }
        }, 66); // ~15fps maximum update rate
        
      } catch (err) {
        console.warn('Visualization error:', err);
        // Enable low performance mode on error
        setLowPerformanceMode(true);
        window.audioState.isLowPerformanceMode = true;
      }
    };
    
    // Start the visualization loop
    updateVisualization();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shouldRender, lowPerformanceMode]);
  
  // Keep volume in sync with global state
  useEffect(() => {
    if (audioRef.current) {
      const effectiveVolume = isMuted ? 0 : volume;
      audioRef.current.volume = effectiveVolume;
      
      // Update global state
      window.audioState.volume = volume;
      window.audioState.isMuted = isMuted;
    }
  }, [volume, isMuted]);
  
  // Toggle play function
  const togglePlay = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Resume context if needed
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.warn('Resume failed:', e));
      }
      
      audioRef.current.play().catch(e => {
        console.warn('Play failed:', e);
      });
    }
  };
  
  // Toggle mute function
  const toggleMute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!audioRef.current) return;
    
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    window.audioState.isMuted = newMuteState;
  };
  
  // Volume change handler
  const handleVolumeChange = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    window.audioState.volume = newVolume;
    
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
      window.audioState.isMuted = false;
    }
  };
  
  // Toggle performance mode function
  const togglePerformanceMode = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newMode = !lowPerformanceMode;
    setLowPerformanceMode(newMode);
    window.audioState.isLowPerformanceMode = newMode;
    
    // Force a reload of audio setup if needed
    if (!newMode && !window.audioState.audioContext) {
      // This will trigger the setup effect
      window.location.reload();
    }
  };
  
  // Don't render if another player is already showing
  if (!shouldRender) return null;
  
  // Determine number of bars based on screen size and performance mode
  const barsToShow = lowPerformanceMode ? 0 : (isMobile ? 8 : 16); // Reduced number of bars
  
  // Use frequency data from state or global state
  const displayData = audioFrequencyData.length > 0 
    ? audioFrequencyData 
    : (window.audioState.frequencyData || []);
  
  return (
    <div 
      ref={playerRef} 
      className={`music-player ${isMuted ? 'player-muted' : ''} ${isInGameScreen ? 'game-screen' : ''} ${lowPerformanceMode ? 'low-performance' : ''}`}
    >
      <div className="player-content">
        <button 
          onClick={togglePlay} 
          className="play-btn"
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        
        {!lowPerformanceMode && (
          <div className="visualization-container">
            {displayData.slice(0, barsToShow).map((value, index) => (
              <div
                key={index}
                className="visualization-bar"
                style={{
                  height: `${(value / 255) * 100}%`,
                }}
              />
            ))}
          </div>
        )}
        
        <div 
          className="volume-control"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button 
            onClick={toggleMute} 
            className="volume-btn"
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="volume-slider"
          />
        </div>
        
        {/* Optional performance mode toggle */}
   
      </div>
    </div>
  );
};

export default MusicPlayer; 