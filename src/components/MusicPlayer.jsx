import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useAccount } from 'wagmi';
import './MusicPlayer.css';

// Use global state for shared audio state across components
if (typeof window !== 'undefined' && !window.audioState) {
  window.audioState = {
    isPlaying: false,
    isMuted: false,
    volume: 0.8,
    frequencyData: [],
    audioElement: null,
    audioContext: null,
    analyser: null,
    source: null
  };
}

const MusicPlayer = () => {
  // Use state that syncs with the global state
  const [isPlaying, setIsPlaying] = useState(() => window.audioState?.isPlaying || false);
  const [volume, setVolume] = useState(() => window.audioState?.volume || 0.8);
  const [isMuted, setIsMuted] = useState(() => window.audioState?.isMuted || false);
  const [audioFrequencyData, setAudioFrequencyData] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [isInGameScreen, setIsInGameScreen] = useState(false);
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
  }, []);

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
      audioElement.setAttribute('playsinline', ''); // Add playsinline for mobile
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
    
    // Set up Web Audio API if needed
    if (!window.audioState.audioContext) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        
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
      }
    } else {
      // Reuse existing audio context and analyzer
      audioContextRef.current = window.audioState.audioContext;
      analyserRef.current = window.audioState.analyser;
      sourceRef.current = window.audioState.source;
    }
    
    // Try to play on first load (will be blocked by most browsers)
    tryToPlay();
    
    // Try to play on user interaction
    const playOnInteraction = () => {
      tryToPlay();
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
      
      // Remove resize listener
      window.removeEventListener('resize', checkMobile);
      
      // Keep audio element and context alive for continuous playback
    };
  }, []);
  
  // Try to play or resume audio
  const tryToPlay = () => {
    if (!audioRef.current) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn('Failed to resume context:', e));
    }
    
    // Try to play audio
    if (audioRef.current.paused) {
      audioRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
    }
  };
  
  // Update visualization in a separate effect
  useEffect(() => {
    if (!shouldRender || !analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateVisualization = () => {
      try {
        // Safety check in case component is unmounting
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Update both local and global state
        const newData = [...dataArray];
        setAudioFrequencyData(newData);
        
        // Safely update global state
        if (window.audioState) {
          window.audioState.frequencyData = newData;
        }
        
        // Limit rate to 30fps to reduce CPU usage
        setTimeout(() => {
          if (analyserRef.current) { // Check again in case component unmounted during timeout
            animationFrameRef.current = requestAnimationFrame(updateVisualization);
          }
        }, 33); // ~30fps
      } catch (err) {
        console.warn('Error in visualization update:', err);
        // If there was an error, retry less frequently
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(updateVisualization);
        }, 1000);
      }
    };
    
    // Start the visualization loop
    updateVisualization();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shouldRender]);
  
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
  
  // Enhanced toggle play with strong event handling for game screen
  const togglePlay = (e) => {
    // Stop event propagation to prevent game from capturing it
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!audioRef.current) return;
    
    // Debug log
    console.log('Music player: togglePlay clicked');
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Resume context if needed
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      audioRef.current.play().catch(e => {
        console.warn('Play failed:', e);
        // Force play through user interaction
        const playAudio = () => {
          audioRef.current.play();
          document.removeEventListener('click', playAudio);
          document.removeEventListener('touchstart', playAudio);
        };
        document.addEventListener('click', playAudio, { once: true });
        document.addEventListener('touchstart', playAudio, { once: true });
      });
    }
  };
  
  // Enhanced toggle mute with strong event handling for game screen
  const toggleMute = (e) => {
    // Stop event propagation to prevent game from capturing it
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Debug log
    console.log('Music player: toggleMute clicked');
    
    if (!audioRef.current) return;
    
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    window.audioState.isMuted = newMuteState;
  };
  
  // Enhanced volume change with strong event handling for game screen
  const handleVolumeChange = (e) => {
    // Stop event propagation to prevent game from capturing it
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Debug log
    console.log('Music player: volume change');
    
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    window.audioState.volume = newVolume;
    
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
      window.audioState.isMuted = false;
    }
  };
  
  // Don't render if another player is already showing
  if (!shouldRender) return null;
  
  // Determine number of bars based on screen size
  const barsToShow = isMobile ? 16 : 32;
  
  // Use frequency data from state or global state
  const displayData = audioFrequencyData.length > 0 
    ? audioFrequencyData 
    : (window.audioState.frequencyData || []);
  
  return (
    <div 
      ref={playerRef} 
      className={`music-player ${isMuted ? 'player-muted' : ''} ${isInGameScreen ? 'game-screen' : ''}`}
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
      </div>
    </div>
  );
};

export default MusicPlayer; 