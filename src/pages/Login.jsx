import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { Shield, Phone, ArrowRight, HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, setupRecaptcha } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate('/emergency');
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      navigate('/emergency');
    } catch (error) {
      alert('Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const confirmation = await setupRecaptcha(phone);
      setConfirmationResult(confirmation);
      setShowOtp(true);
    } catch (error) {
      alert('Failed to send OTP. Please check phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setIsLoading(true);
      await confirmationResult.confirm(otp);
      navigate('/emergency');
    } catch (error) {
      alert('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center p-6 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emergency-600/30 rounded-full blur-3xl shadow-[0_0_100px_rgba(20,184,166,0.3)] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-[40%] left-[20%] w-full h-[20%] bg-emergency-400/10 rotate-45 blur-2xl"></div>

      <div className="max-w-md mx-auto w-full relative z-10">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emergency-500/20 to-transparent rounded-3xl"></div>
            <HeartPulse className="text-emergency-400 w-12 h-12" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3 drop-shadow-lg">
            LifeLink
          </h1>
          <p className="text-gray-300 text-lg font-light tracking-wide">
            Rapid Emergency Response
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl p-8 space-y-6">
          {!showOtp ? (
            <div className="space-y-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-2xl shadow-xl transform active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:scale-100"
              >
                <FcGoogle size={24} />
                <span className="text-lg">Continue with Google</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-500/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-gray-400 font-medium">Authentication</span>
                </div>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
                    Phone Login
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emergency-400 transition-colors">
                      <Phone size={20} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-gray-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all font-medium tracking-wide text-lg backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emergency-600 to-emergency-500 hover:from-emergency-500 hover:to-emergency-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emergency-500/30 transform active:scale-95 transition-all duration-300 text-lg flex items-center justify-center gap-2 group disabled:opacity-70 disabled:scale-100"
                >
                  {isLoading ? 'Verifying...' : 'Continue'}
                  {!isLoading && <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 animation-fade-in text-white">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emergency-500/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-emergency-500/30">
                  <Shield className="text-emergency-400 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Verification details</h3>
                <p className="text-gray-400 text-sm">Code sent to <span className="text-white font-medium">{phone}</span></p>
              </div>
              
              <div className="space-y-5">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center tracking-[1em] py-4 bg-white/5 border border-gray-500/30 rounded-2xl text-white text-2xl focus:outline-none focus:border-emergency-500/50 focus:ring-2 focus:ring-emergency-500/20 transition-all backdrop-blur-sm"
                  maxLength="6"
                  autoFocus
                />
                <button 
                  onClick={verifyOtp}
                  disabled={isLoading || otp.length < 6}
                  className="w-full bg-gradient-to-r from-emergency-600 to-emergency-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emergency-500/30 transform active:scale-95 transition-all duration-300 text-lg disabled:opacity-50 disabled:active:scale-100"
                >
                  {isLoading ? 'Confirming...' : 'Verify Securely'}
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setShowOtp(false)}
                    className="text-gray-400 hover:text-white font-medium py-2 text-sm transition-colors"
                  >
                    Change Phone Number
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-xs text-center backdrop-blur-sm py-2 px-4 rounded-full bg-white/5 border border-white/5 w-max mx-auto">
          <Shield size={14} />
          <span>Encrypted Enterprise Security</span>
        </div>
      </div>
    </div>
  );
}
