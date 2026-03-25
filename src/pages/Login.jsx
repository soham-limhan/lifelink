import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, ArrowRight, HeartPulse, User, Lock, Activity, Truck } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, loginUser, registerUser, loginWithGoogle } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user' | 'ambulance'
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'ambulance') {
        navigate('/dashboard');
      } else {
        navigate('/emergency');
      }
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await loginWithGoogle(role);
      // navigation handled by useEffect
    } catch (error) {
      setErrorMsg(error.message || 'Google Auth failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setIsLoading(true);

      if (isLogin) {
        await loginUser(phone, password);
        // Navigate based on role is handled by the redirect above on next render
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await registerUser(name, phone, password, role);
      }
    } catch (error) {
      setErrorMsg(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrorMsg('');
    setPhone('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setRole('user');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center p-6 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emergency-600/30 rounded-full blur-3xl shadow-[0_0_100px_rgba(20,184,166,0.3)] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-[40%] left-[20%] w-full h-[20%] bg-emergency-400/10 rotate-45 blur-2xl"></div>

      <div className="max-w-md mx-auto w-full relative z-10 my-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emergency-500/20 to-transparent rounded-3xl"></div>
            <HeartPulse className="text-emergency-400 w-10 h-10" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">
            LifeLink
          </h1>
          <p className="text-gray-300 text-lg font-light tracking-wide">
            {isLogin ? 'Welcome Back' : 'Join the Network'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl p-8 space-y-6">
          
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Register specific fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emergency-400 transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-gray-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all text-base backdrop-blur-sm"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                    Select Role
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border transition-all ${
                        role === 'user' 
                        ? 'bg-emergency-500/20 border-emergency-500 text-emergency-100' 
                        : 'bg-white/5 border-gray-500/30 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <User size={18} />
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ambulance')}
                      className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border transition-all ${
                        role === 'ambulance' 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-100' 
                        : 'bg-white/5 border-gray-500/30 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Truck size={18} />
                      Ambulance
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emergency-400 transition-colors">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-gray-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all font-medium tracking-wide text-base backdrop-blur-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emergency-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-gray-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all text-base backdrop-blur-sm"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emergency-400 transition-colors">
                    <Shield size={18} />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-gray-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all text-base backdrop-blur-sm"
                    required
                  />
                </div>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emergency-600 to-emergency-500 hover:from-emergency-500 hover:to-emergency-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emergency-500/30 transform active:scale-95 transition-all duration-300 text-lg flex items-center justify-center gap-2 group disabled:opacity-70 disabled:scale-100 mt-4"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
              {!isLoading && <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white text-gray-900 font-bold py-3.5 px-4 rounded-2xl shadow-lg border border-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
            >
              <FcGoogle size={24} />
              Continue with Google
            </button>
          </div>

          <div className="text-center pt-2 border-t border-white/10 mt-6">
            <p className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="ml-2 text-emergency-400 hover:text-emergency-300 font-semibold transition-colors focus:outline-none"
              >
                {isLogin ? 'Register now' : 'Login here'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-xs text-center backdrop-blur-sm py-2 px-4 rounded-full bg-white/5 border border-white/5 w-max mx-auto">
          <Shield size={14} />
          <span>Encrypted Enterprise Security</span>
        </div>
      </div>
    </div>
  );
}
