import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../context/AuthContext';
import { MapPin, Phone, User, Activity, Navigation, CheckCircle2 } from 'lucide-react';

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
  const { location, loading: locLoading } = useLocation();

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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
      {/* Top Map Display Area */}
      <div className="h-[40vh] w-full bg-slate-200 relative z-0 rounded-b-[2rem] overflow-hidden shadow-sm">
        {locLoading || !location ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 backdrop-blur-sm z-10">
            <div className="w-16 h-16 border-4 border-emergency-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">Acquiring high-accuracy location...</p>
          </div>
        ) : (
          <MapContainer 
            center={[location.lat, location.lng]} 
            zoom={15} 
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {/* User Pulse Marker */}
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup className="font-semibold text-emergency-600">Your Location</Popup>
            </Marker>
            
            {/* Nearby Ambulances */}
            {nearbyAmbulances.map(amb => (
              <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={ambulanceIcon} />
            ))}
          </MapContainer>
        )}
        
        {/* Floating gradient overlay for map blend */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-[1000]"></div>
      </div>

      {/* Main Content Card replacing standard layout */}
      <div className="max-w-xl mx-auto px-4 -mt-16 relative z-[2000]">
        
        {/* User Info Header Floating Card */}
        <div className="bg-white rounded-[1.5rem] shadow-xl shadow-emergency-900/5 p-5 mb-6 backdrop-blur-3xl border border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emergency-100 flex items-center justify-center text-emergency-600">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Reporting as</p>
              <p className="text-slate-800 font-bold">{user?.phoneNumber || 'Authenticated User'}</p>
            </div>
          </div>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> SECURE
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Detailed Cards for form */}
          <div className="bg-white rounded-[2rem] shadow-xl p-7 border border-slate-100 space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Navigation size={20} className="text-emergency-500" /> Exact Location
              </h2>
              <div className="mt-3 relative">
                <textarea
                  name="victimAddress"
                  value={formData.victimAddress}
                  onChange={handleChange}
                  placeholder="E.g., Highway 54, near the gas station, silver car..."
                  className="w-full bg-slate-50 border-0 rounded-xl p-4 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emergency-500/30 outline-none resize-none min-h-[100px] text-lg font-medium"
                />
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User size={20} className="text-emergency-500" /> Witness Details
              </h2>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <input
                  type="text"
                  name="witnessName"
                  value={formData.witnessName}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-50 border-0 rounded-xl p-4 focus:ring-2 focus:ring-emergency-500/30 outline-none font-medium"
                  required
                />
                <input
                  type="tel"
                  name="witnessPhone"
                  value={formData.witnessPhone}
                  onChange={handleChange}
                  placeholder="Contact No."
                  className="w-full bg-slate-50 border-0 rounded-xl p-4 focus:ring-2 focus:ring-emergency-500/30 outline-none font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Activity size={20} className="text-red-500" /> Patient Condition
              </h2>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { id: 'critical', label: 'Critical', color: 'red' },
                  { id: 'moderate', label: 'Moderate', color: 'amber' },
                  { id: 'stable', label: 'Stable', color: 'emerald' }
                ].map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: level.id })}
                    className={`py-3 rounded-xl font-bold transition-all text-sm border-2 ${
                      formData.severity === level.id 
                      ? `bg-${level.color}-50 border-${level.color}-500 text-${level.color}-700 shadow-sm` 
                      : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Details (conscious, bleeding, fractures...)"
                className="w-full bg-slate-50 border-0 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-emergency-500/30 outline-none resize-none min-h-[80px]"
              />
            </div>
            
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 z-[9000] pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-xl mx-auto">
              <button
                type="submit"
                disabled={locLoading || !location}
                className="w-full h-16 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xl font-black rounded-2xl shadow-xl shadow-red-500/30 flex items-center justify-center gap-3 transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                <div className="p-2 bg-white/20 rounded-full animate-pulse">
                  <Phone size={24} fill="white" />
                </div>
                DISPATCH AMBULANCE
              </button>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
}
