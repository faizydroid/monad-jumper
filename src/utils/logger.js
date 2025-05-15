/**
 * Centralized logger utility that disables logs in production
 */

// Check if we're in production environment
const isProduction = typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1') &&
                     !window.location.hostname.includes('192.168.');

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Create production-safe versions of console methods
const logger = {
  log: isProduction ? 
    function() {} : 
    function(...args) { originalConsole.log(...args); },
    
  error: isProduction ? 
    function(...args) {
      // Only log critical errors in production
      const errorString = String(args);
      if (errorString.includes('critical') || 
          errorString.includes('fatal') || 
          errorString.includes('uncaught')) {
        originalConsole.error(...args);
      }
    } : 
    function(...args) { originalConsole.error(...args); },
    
  warn: isProduction ? 
    function() {} : 
    function(...args) { originalConsole.warn(...args); },
    
  info: isProduction ? 
    function() {} : 
    function(...args) { originalConsole.info(...args); },
    
  debug: isProduction ? 
    function() {} : 
    function(...args) { originalConsole.debug(...args); }
};

// Replace console methods globally if desired
function overrideConsole() {
  console.log = logger.log;
  console.error = logger.error;
  console.warn = logger.warn;
  console.info = logger.info;
  console.debug = logger.debug;
}

// Initialize by overriding console if this is imported
if (isProduction) {
  overrideConsole();
}

export default logger;
export { overrideConsole }; 