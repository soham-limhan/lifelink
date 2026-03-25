import { useEffect, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Shield, CheckCircle, Navigation } from 'lucide-react';

const userIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Custom Ambulance Logo using an emoji
const ambulanceLogo = new L.divIcon({
  html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5)); transform: scaleX(-1);">🚑</div>`,
  className: 'custom-ambulance-icon bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function Tracking() {
  const navigate = useNavigate();
  const { state } = useRouterLocation();
  const { location: realTimeLocation } = useLocation();
  
  const [status, setStatus] = useState('searching'); // searching, assigned, arrived
  const [ambulance, setAmbulance] = useState(null);
  const [eta, setEta] = useState(null);
  
  const [emergencyId, setEmergencyId] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [initialEta, setInitialEta] = useState(null);

  useEffect(() => {
    if (!state?.location) {
      navigate('/emergency');
      return;
    }

    const createEmergencyRequest = async () => {
      try {
        const storedToken = localStorage.getItem('lifelink_token');
        const userStr = localStorage.getItem('lifelink_user');
        const userData = userStr ? JSON.parse(userStr) : null;
        
        const payload = {
          userId: userData?.id || 'guest',
          name: state.requestData?.witnessName || 'Unknown User',
          phone: state.requestData?.witnessPhone || '0000000000',
          location: `${state.location.lat},${state.location.lng}`
        };

        const res = await fetch('http://localhost:5000/api/emergency/request', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`
          },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok && data.emergencyId) {
          setEmergencyId(data.emergencyId);
        }
      } catch (err) {
        console.error("Failed to create emergency request", err);
      }
    };

    createEmergencyRequest();
  }, [state, navigate]);

  // Polling for status
  useEffect(() => {
    if (!emergencyId || status === 'arrived') return;

    const fetchRoute = async (startLoc, data) => {
      try {
         const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLoc.lng},${startLoc.lat};${state.location.lng},${state.location.lat}?overview=full&geometries=geojson`);
         const routeData = await routeRes.json();
         if (routeData.routes && routeData.routes.length > 0) {
            const coords = routeData.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            setRoutePath(coords);
            const durationMins = Math.max(1, Math.ceil(routeData.routes[0].duration / 60));
            setEta(durationMins);
            setInitialEta(durationMins);
            
            setAmbulance({
              id: data.ambulanceId || 'AMB-DISPATCH',
              driverName: 'Assigned Responder',
              driverPhone: 'Emergency Comm',
              vehicleNumber: 'EN-ROUTE',
              location: startLoc,
              rating: 5.0,
            });
            setStatus('assigned');
         }
      } catch (err) {
         setRoutePath([startLoc, state.location]);
         setAmbulance(prev => ({ ...prev, location: startLoc }));
         setStatus('assigned');
      }
    };

    const checkStatus = async () => {
      try {
        const storedToken = localStorage.getItem('lifelink_token');
        const res = await fetch(`http://localhost:5000/api/emergency/status/${emergencyId}`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const data = await res.json();
        
        if (res.ok) {
           if (data.status === 'resolved') {
              setStatus('arrived');
              setEta(0);
           } else if (data.status === 'accepted' && data.ambulanceLocation) {
              fetchRoute(data.ambulanceLocation, data);
           }
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    };

    const pollTimer = setInterval(checkStatus, 3000);
    return () => clearInterval(pollTimer);
  }, [emergencyId, status, state]);

  if (!state?.location) return null;

  const currentMapCenter = realTimeLocation || state.location;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0 h-[100dvh]">
        <MapContainer 
          center={[currentMapCenter.lat, currentMapCenter.lng]} 
          zoom={14} 
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[currentMapCenter.lat, currentMapCenter.lng]} icon={userIcon}>
            <Popup className="bg-slate-900 text-white border-none rounded-lg font-bold">Incident Location</Popup>
          </Marker>
          
          {ambulance && routePath && (
            <>
              {/* Draw the full real-time remaining path from the ambulance to user */}
              <Polyline 
                positions={routePath}
                pathOptions={{
                  color: '#34d399',
                  weight: 6,
                  opacity: 0.9,
                  lineJoin: 'round',
                  lineCap: 'round',
                  className: 'route-path-animation'
                }}
              />
              {/* Live ambulance marker driven by real-world telemetry updates every 3s */}
              <Marker position={[ambulance.location.lat, ambulance.location.lng]} icon={ambulanceLogo} />
            </>
          )}
        </MapContainer>
        
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-[1000]"></div>
      </div>

      {/* Floating Top Header Pill */}
      <div className="absolute top-safe-area left-1/2 -translate-x-1/2 mt-6 z-[2000] w-max max-w-[90%] bg-slate-900/95 backdrop-blur-2xl px-5 py-3.5 rounded-full shadow-lg shadow-black/50 border border-slate-700 flex items-center gap-3 transition-all duration-500">
        {status === 'searching' && (
          <>
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></div>
            <span className="font-bold text-white text-sm tracking-wide">Finding closest unit...</span>
          </>
        )}
        {status === 'assigned' && (
          <>
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]"></div>
            <span className="font-bold text-slate-200 text-sm tracking-wide">
              Arriving in <span className="text-emerald-400 font-black">{eta} MIN</span>
            </span>
          </>
        )}
        {status === 'arrived' && (
          <>
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.6)]"></div>
            <span className="font-bold text-emerald-400 text-sm tracking-wide">Unit has arrived</span>
          </>
        )}
      </div>

      {/* Modern Bottom Sheet - Uber Style */}
      <div className="absolute bottom-0 inset-x-0 bg-slate-900 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[2000] transition-transform duration-500 pt-5 pb-8 px-6 border-t border-slate-800 flex flex-col mx-auto max-w-xl">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-5 drop-shadow-sm"></div>

        {status === 'searching' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mb-5 relative shadow-inner">
              <div className="absolute inset-0 rounded-full border-4 border-emergency-500 border-t-transparent animate-spin opacity-80"></div>
              <span className="text-4xl animate-pulse">🚑</span>
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Connecting</h2>
            <p className="text-sm text-slate-400 font-medium px-4 max-w-xs">Contacting the closest available response unit in your area.</p>
          </div>
        )}

        {status === 'assigned' && ambulance && (
          <div className="space-y-5 animate-fade-in w-full">
            <div className="flex justify-between items-center text-white bg-slate-800/80 border border-slate-700 p-4 rounded-2xl shadow-inner">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-slate-700 rounded-[1rem] flex items-center justify-center transform shadow-sm border border-slate-600">
                    <span className="text-2xl drop-shadow-sm">🚑</span>
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-white leading-none mb-1">{eta} <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">min away</span></h1>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1"><Navigation size={12} strokeWidth={3} /> Approaching fast</p>
                 </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-slate-700 rounded-full border border-slate-600 shadow-sm flex items-center justify-center text-2xl z-10 relative object-cover overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${ambulance.driverName}&backgroundColor=334155`} alt="driver" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 text-slate-200">
                    <span className="text-amber-400">★</span> 4.9
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-base text-white tracking-tight leading-none mb-1.5">{ambulance.driverName}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span className="bg-slate-800 px-2 py-1 rounded-md text-slate-300 border border-slate-700 shadow-sm">{ambulance.vehicleNumber}</span>
                  </div>
                </div>
              </div>
              
              <a 
                href={`tel:${ambulance.driverPhone}`}
                className="w-14 h-14 bg-white text-slate-900 rounded-[1.2rem] flex items-center justify-center hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
              >
                <Phone size={22} fill="currentColor" />
              </a>
            </div>

            <div className="pt-2 flex gap-3">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-4 rounded-[1.25rem] flex items-center justify-center gap-2 transition-colors border border-slate-700 shadow-sm">
                <Shield size={18} /> Share Status
              </button>
            </div>
          </div>
        )}

        {status === 'arrived' && (
          <div className="text-center py-6 animate-pulse">
            <div className="w-20 h-20 bg-emerald-950/50 border-4 border-emerald-900 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-inner">
              <CheckCircle size={36} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Team Arrived</h2>
            <p className="text-sm text-slate-400 font-medium mb-6 max-w-[250px] mx-auto">
              Please co-operate and follow their instructions.
            </p>
            <button
              onClick={() => navigate('/emergency')}
              className="w-full bg-slate-800 text-white font-bold tracking-wide py-4 rounded-[1.25rem] hover:bg-slate-700 transition-colors shadow-lg border border-slate-700"
            >
              Close Tracker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
