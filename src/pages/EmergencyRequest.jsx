import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../context/AuthContext';
import { MapPin, Phone, User, Activity, Navigation, CheckCircle2, AlertTriangle } from 'lucide-react';

// Custom icons for Leaflet
const userIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function EmergencyRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location, loading: locLoading, error: locError } = useLocation();

  const [formData, setFormData] = useState({
    victimAddress: '',
    witnessName: user?.displayName || '',
    witnessPhone: user?.phoneNumber || '',
    description: '',
    severity: 'critical'
  });

  const [nearbyAmbulances, setNearbyAmbulances] = useState([]);

  useEffect(() => {
    if (location) {
      // Generate some dummy ambulances near user
      setNearbyAmbulances([
        { id: 1, lat: location.lat + 0.01, lng: location.lng + 0.01 },
        { id: 2, lat: location.lat - 0.005, lng: location.lng + 0.008 },
        { id: 3, lat: location.lat + 0.008, lng: location.lng - 0.01 }
      ]);
    }
  }, [location?.lat, location?.lng]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    navigate('/tracking', {
      state: { requestData: formData, location }
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 font-sans relative overflow-hidden">
      {/* Full Screen Map Display Area */}
      <div className="absolute inset-0 z-0 h-[100dvh]">
        {locLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-10 transition-all duration-500">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute w-24 h-24 bg-emergency-900 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-16 h-16 bg-slate-800 border-4 border-emergency-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
            </div>
            <p className="text-slate-300 font-bold tracking-wide animate-pulse">Acquiring precise location...</p>
          </div>
        ) : (
          <MapContainer 
            center={[location.lat, location.lng]} 
            zoom={16} 
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* User Pulse Marker */}
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup className="font-semibold text-emergency-500 bg-slate-900 text-white border-0">Your Location</Popup>
            </Marker>
            
            {/* Nearby Ambulances */}
            {nearbyAmbulances.map(amb => (
              <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={ambulanceIcon} />
            ))}
          </MapContainer>
        )}
        
        {/* Floating gradient overlay for map blend */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-[1000]"></div>
        
        {/* Location Error / Denied Banner */}
        {locError && !locLoading && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[2000] bg-amber-500/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-lg shadow-amber-900/50 flex gap-3 items-center border border-amber-400 animate-fade-in">
            <AlertTriangle className="w-6 h-6 shrink-0 drop-shadow-sm" />
            <div className="flex-1">
              <p className="text-sm font-black drop-shadow-sm tracking-wide">Location access restricted</p>
              <p className="text-xs font-semibold text-amber-50 drop-shadow-sm leading-tight mt-0.5">Please click the lock icon 🔒 next to the url bar to allow location.</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Floating Header Card */}
      <div className="absolute top-4 left-4 right-4 z-[2000] flex justify-between items-start pointer-events-none max-w-xl mx-auto">
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl rounded-[1.25rem] shadow-xl shadow-black/50 p-3 flex items-center gap-3 border border-slate-700/60">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emergency-500 border border-slate-700">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Authenticated</p>
            <p className="text-white font-bold leading-tight text-sm">{user?.phoneNumber || 'Guest User'}</p>
          </div>
        </div>
        <div className="pointer-events-auto bg-green-500/20 backdrop-blur-md border border-green-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 size={12} strokeWidth={3} /> SECURE
        </div>
      </div>

      {/* Modern Bottom Sheet Data Entry (Dark Mode) */}
      <div className="absolute bottom-0 inset-x-0 bg-slate-900 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] z-[2000] rounded-t-[2rem] border-t border-slate-700/50 flex flex-col max-h-[75dvh]">
        <div className="flex-shrink-0 pt-4 pb-2 bg-slate-900 rounded-t-[2rem] relative z-[2010]">
          {/* Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto"></div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-2 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
            
            {/* Form Fields wrapped in premium dark style */}
            <div className="space-y-6">
              
              <div className="pb-2">
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Navigation size={16} className="text-emergency-500" /> Exact Location
                </h2>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emergency-600/20 to-emergency-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                  <textarea
                    name="victimAddress"
                    value={formData.victimAddress}
                    onChange={handleChange}
                    placeholder="E.g., Highway 54, near the gas station, silver car..."
                    className="relative w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-500 focus:border-emergency-500 focus:bg-slate-800 focus:ring-4 focus:ring-emergency-500/20 outline-none resize-none min-h-[90px] text-base font-medium transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="pb-2">
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <User size={16} className="text-emergency-500" /> Witness Details
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="witnessName"
                    value={formData.witnessName}
                    onChange={handleChange}
                    placeholder="Your Full Name"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3.5 focus:border-emergency-500 focus:bg-slate-800 focus:ring-4 focus:ring-emergency-500/20 outline-none font-medium text-white transition-all shadow-inner placeholder-slate-500"
                    required
                  />
                  <input
                    type="tel"
                    name="witnessPhone"
                    value={formData.witnessPhone}
                    onChange={handleChange}
                    placeholder="Contact No."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3.5 focus:border-emergency-500 focus:bg-slate-800 focus:ring-4 focus:ring-emergency-500/20 outline-none font-medium text-white transition-all shadow-inner placeholder-slate-500"
                    required
                  />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-red-500" /> Patient Condition
                </h2>
                
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[
                    { id: 'critical', label: 'Critical', color: 'red', icon: '🚨' },
                    { id: 'moderate', label: 'Moderate', color: 'amber', icon: '⚠️' },
                    { id: 'stable', label: 'Stable', color: 'emerald', icon: '✅' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity: level.id })}
                      className={`relative flex flex-col items-center justify-center py-3.5 rounded-2xl transition-all border-2 overflow-hidden ${
                        formData.severity === level.id 
                        ? (level.id === 'critical' ? 'bg-red-950/50 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                          : level.id === 'moderate' ? 'bg-amber-950/50 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-emerald-950/50 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]')
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg mb-1">{level.icon}</span>
                      <span className="font-bold text-[11px] uppercase tracking-wider">{level.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Details (conscious, bleeding, fractures...)"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-500 focus:border-emergency-500 focus:bg-slate-800 focus:ring-4 focus:ring-emergency-500/20 outline-none resize-none min-h-[80px] font-medium transition-all shadow-inner"
                />
              </div>
              
            </div>

            {/* Submit Bar */}
            <div className="pt-2 pb-4">
              <button
                type="submit"
                className="group relative w-full h-[64px] bg-red-600 border border-red-700 hover:bg-red-500 text-white text-lg font-black tracking-wide rounded-[1.25rem] shadow-xl shadow-red-900/40 flex items-center justify-center gap-3 transform transition-all active:scale-[0.98] overflow-hidden"
              >
                {/* Sweep animation background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <div className="p-1.5 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-red-400 transition-colors duration-300">
                  <Phone size={20} fill="currentColor" />
                </div>
                REQUEST AMBULANCE
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
