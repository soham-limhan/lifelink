import { useEffect, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Clock, Shield, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';

const userIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function Tracking() {
  const navigate = useNavigate();
  const { state } = useRouterLocation();
  const { location: realTimeLocation } = useLocation(); // Keep tracking user
  
  const [status, setStatus] = useState('searching'); // searching, assigned, arrived
  const [ambulance, setAmbulance] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    if (!state?.location) {
      navigate('/emergency');
      return;
    }

    // Mock sequence of backend responses
    const searchTimer = setTimeout(() => {
      const mockAmbulance = {
        id: 'AMB-7842',
        driverName: 'Rajesh Kumar',
        driverPhone: '+91 98765 12345',
        vehicleNumber: 'MH-02-AB-1234',
        location: {
          lat: state.location.lat + 0.015,
          lng: state.location.lng - 0.01
        },
        rating: 4.9,
        eta: 3 // minutes initially
      };

      setAmbulance(mockAmbulance);
      setStatus('assigned');
      setEta(mockAmbulance.eta);
    }, 4000);

    return () => clearTimeout(searchTimer);
  }, [state, navigate]);

  // Simulate routing by moving the ambulance closer every interval
  useEffect(() => {
    if (status === 'assigned' && ambulance && eta > 0) {
      const timer = setInterval(() => {
        setEta(prev => {
          if (prev <= 1) {
            setStatus('arrived');
            return 0;
          }
          return prev - 1;
        });
        
        // Move ambulance towards target slightly
        setAmbulance(prev => ({
          ...prev,
          location: {
            lat: prev.location.lat + (state.location.lat - prev.location.lat) * 0.3,
            lng: prev.location.lng + (state.location.lng - prev.location.lng) * 0.3
          }
        }));
      }, 30000); // Update every 30 sec
      
      return () => clearInterval(timer);
    }
  }, [status, ambulance, eta, state]);

  if (!state?.location) return null;

  // Render current user location fallback to initial state location
  const currentMapCenter = realTimeLocation || state.location;

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden font-sans">
      
      {/* Full Screen Map behind bottom sheet */}
      <div className="absolute inset-0 z-0 h-[65vh]">
        <MapContainer 
          center={[currentMapCenter.lat, currentMapCenter.lng]} 
          zoom={14} 
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[currentMapCenter.lat, currentMapCenter.lng]} icon={userIcon}>
            <Popup>Incident Location</Popup>
          </Marker>
          
          {ambulance && (
            <Marker position={[ambulance.location.lat, ambulance.location.lng]} icon={ambulanceIcon} />
          )}
        </MapContainer>
      </div>

      {/* Floating Status Pill over Map */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-max max-w-[90%] bg-white/90 backdrop-blur-xl px-5 py-3 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
        {status === 'searching' && (
          <>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
            <span className="font-bold text-slate-800 text-sm">Deploying nearest unit...</span>
          </>
        )}
        {status === 'assigned' && (
          <>
            <div className="w-2 h-2 bg-emergency-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-slate-800 text-sm">Ambulance arriving in {eta} min</span>
          </>
        )}
        {status === 'arrived' && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-bold text-green-700 text-sm">Unit has arrived</span>
          </>
        )}
      </div>

      {/* Bottom Sheet UI - Ride sharing app style */}
      <div className="absolute bottom-0 w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_50px_rgba(0,0,0,0.15)] z-[2000] transition-all duration-500 p-8 pt-4 pb-12 overflow-y-auto max-h-[85vh]">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

        {status === 'searching' && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-20 h-20 bg-emergency-50 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-emergency-500 border-t-transparent animate-spin"></div>
              <span className="text-4xl">🚑</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Connecting to Services</h2>
            <p className="text-slate-500 font-medium px-4">Algorithms are matching your emergency to the closest equipped medical team.</p>
          </div>
        )}

        {status === 'assigned' && ambulance && (
          <div className="space-y-6 animate-fade-in text-white">
            <div className="flex justify-between items-center text-slate-800 border-b border-slate-100 pb-6">
              <div>
                <h1 className="text-4xl font-black text-emergency-600 mb-1">{eta} <span className="text-xl text-slate-500">min</span></h1>
                <p className="font-bold flex items-center gap-1"><Navigation size={16} /> Distance: ~2.1 km</p>
              </div>
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center transform rotate-[-10deg] shadow-inner">
                <span className="text-4xl drop-shadow-md">🚑</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xl">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{ambulance.driverName}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span>{ambulance.vehicleNumber}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-amber-500 font-bold flex items-center">★ {ambulance.rating}</span>
                  </div>
                </div>
              </div>
              <a 
                href={`tel:${ambulance.driverPhone}`}
                className="w-12 h-12 bg-emergency-100 text-emergency-700 rounded-full flex items-center justify-center hover:bg-emergency-200 transition-colors shadow-sm"
              >
                <Phone size={22} fill="currentColor" />
              </a>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-inner">
              <AlertTriangle className="text-emergency-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Clear the route</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  The ambulance is approaching with lights down the street. Please guide them and ensure safe passage.
                </p>
              </div>
            </div>

            <button className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition">
              <Shield size={20} /> Share Status & Tracker
            </button>
          </div>
        )}

        {status === 'arrived' && (
          <div className="text-center py-6 animation-pulse">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <CheckCircle size={48} fill="currentColor" className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3">Help has arrived</h2>
            <p className="text-slate-500 font-medium mb-8 max-w-[250px] mx-auto">
              Medical team is now on-site. Follow their instructions carefully.
            </p>
            <button
              onClick={() => navigate('/emergency')}
              className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-200 transition"
            >
              Report New Emergency
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
