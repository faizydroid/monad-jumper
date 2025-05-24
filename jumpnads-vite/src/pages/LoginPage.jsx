import { Link } from 'react-router-dom';
import DiscordLoginButton from '../components/DiscordLoginButton';

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-indigo-900 px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to JumpNads</h1>
          <p className="text-white/80">Sign in to track your progress and compete on leaderboards</p>
        </div>
        
        <div className="space-y-4">
          <DiscordLoginButton className="w-full" />
          
          <div className="text-center mt-6">
            <Link to="/home" className="text-blue-300 hover:text-blue-200 text-sm">
              Continue as guest
            </Link>
          </div>
          
          <div className="text-white/60 text-xs text-center mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 