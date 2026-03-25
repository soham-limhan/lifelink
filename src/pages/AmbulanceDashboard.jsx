import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, Navigation, CheckCircle2, MapPin, Phone, User, Activity } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const userIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const ambulanceLogo = new L.divIcon({
  html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5)); transform: scaleX(-1);">🚑</div>`,
  className: 'custom-ambulance-icon bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function AmbulanceDashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEmergency, setActiveEmergency] = useState(null);
  
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [eta, setEta] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [historyNodes, setHistoryNodes] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'ambulance') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem('lifelink_token');
        const res = await fetch('http://localhost:5000/api/emergency/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setPendingEmergencies(data.emergencies || []);
        }
      } catch (err) {
        console.error("Failed to fetch pending emergencies", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync GPS to backend constantly while on a case
  useEffect(() => {
    if (!activeEmergency || !user) return;

    const streamLocation = async () => {
      try {
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) reject('No GPS');
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
        
        const ambLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAmbulanceLocation(ambLoc);

        const token = localStorage.getItem('lifelink_token');
        await fetch(`http://localhost:5000/api/emergency/location/${activeEmergency.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ location: ambLoc })
        });
      } catch (err) {
        console.warn("GPS tracking sync failed", err);
      }
    };

    streamLocation();
    const interval = setInterval(streamLocation, 3000);
    return () => clearInterval(interval);
  }, [activeEmergency, user]);

  useEffect(() => {
    if (showHistory) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem('lifelink_token');
          const res = await fetch(`http://localhost:5000/api/emergency/history?ambulanceId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setHistoryNodes(data.history || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchHistory();
    }
  }, [showHistory, user]);

  const handleAccept = async (emergencyId) => {
    try {
      const token = localStorage.getItem('lifelink_token');
      const res = await fetch(`http://localhost:5000/api/emergency/accept/${emergencyId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ambulanceId: user.id })
      });

      if (res.ok) {
        const acceptedReq = pendingEmergencies.find(e => e.id === emergencyId);
        setActiveEmergency(acceptedReq);
        setPendingEmergencies(prev => prev.filter(e => e.id !== emergencyId));

        // 1. Get raw victim location
        const [latStr, lngStr] = acceptedReq.location.split(',');
        const victimLoc = { lat: parseFloat(latStr), lng: parseFloat(lngStr) };

        // 2. Obtain real-time Ambulance GPS (or fallback to nearby mock)
        let ambLoc;
        try {
          const pos = await new Promise((resolve, reject) => {
             if (!navigator.geolocation) reject('No GPS');
             navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
          });
          ambLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (err) {
          ambLoc = { lat: victimLoc.lat + 0.02, lng: victimLoc.lng - 0.015 };
        }
        setAmbulanceLocation(ambLoc);

        // 3. Fetch OSRM Routing
        try {
          const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${ambLoc.lng},${ambLoc.lat};${victimLoc.lng},${victimLoc.lat}?overview=full&geometries=geojson`);
          const routeData = await routeRes.json();
          if (routeData.routes && routeData.routes.length > 0) {
            const coords = routeData.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            setRoutePath(coords);
            setEta(Math.max(1, Math.ceil(routeData.routes[0].duration / 60)));
          } else {
            setRoutePath([ambLoc, victimLoc]);
          }
        } catch (err) {
          setRoutePath([ambLoc, victimLoc]);
        }
      } else {
        alert('Failed to accept request. It might have been taken by another unit.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async () => {
    try {
      const token = localStorage.getItem('lifelink_token');
      await fetch(`http://localhost:5000/api/emergency/resolve/${activeEmergency.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setActiveEmergency(null);
      setAmbulanceLocation(null);
      setRoutePath(null);
      setEta(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white p-6 relative overflow-hidden flex flex-col">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emergency-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-3xl shadow-xl mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            <Shield className="text-blue-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-white">Dispatch Hub</h1>
            <p className="text-sm font-semibold text-blue-400 capitalize flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Unit Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-blue-400 hover:text-white px-4 py-2 font-semibold transition-colors border border-blue-500/30 bg-blue-500/10 rounded-full text-sm"
          >
            {showHistory ? 'View Pings' : 'View History'}
          </button>
          <button 
            onClick={() => logoutUser()}
            className="text-slate-400 hover:text-white px-4 py-2 font-semibold transition-colors bg-slate-800 rounded-full text-sm border border-slate-700"
          >
            Go Offline
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {showHistory ? (
          <div className="space-y-4 animate-fade-in pb-20 overflow-y-auto custom-scrollbar">
             <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> Past Missions</h2>
             {historyNodes.length === 0 ? (
               <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-[2rem] p-12 text-center text-slate-500 font-bold">No completed missions yet.</div>
             ) : (
               historyNodes.map(node => (
                 <div key={node.id} className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl flex justify-between items-center opacity-80 backdrop-blur-md">
                   <div>
                     <h3 className="font-bold text-white text-lg">{node.name}</h3>
                     <p className="text-slate-400 text-sm">{new Date(node.resolvedAt).toLocaleString()}</p>
                   </div>
                   <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold w-max shadow-inner shadow-emerald-500/20">
                     RESOLVED
                   </div>
                 </div>
               ))
             )}
          </div>
        ) : activeEmergency ? (
           <div className="animate-fade-in space-y-6">
             <div className="bg-emerald-500/20 border border-emerald-500/50 p-6 rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-md text-center">
               <div className="w-16 h-16 bg-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-400 shadow-inner">
                 <CheckCircle2 className="w-8 h-8 text-emerald-400" />
               </div>
               <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Dispatch Assigned!</h2>
               <p className="text-emerald-300 font-medium text-sm">Proceed to the target coordinates immediately.</p>
             </div>

             {/* Live Directional Map */}
             {ambulanceLocation && (
               <div className="h-[300px] w-full rounded-[2rem] overflow-hidden border border-slate-700 shadow-xl relative mt-2 bg-slate-900">
                 <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-lg flex items-center gap-2">
                   <Navigation className="text-emerald-400" size={16} />
                   <span className="text-white font-bold text-sm tracking-wide">
                     {eta ? `ETA: ${eta} MIN` : 'Routing...'}
                   </span>
                 </div>
                 
                 <MapContainer 
                   center={[ambulanceLocation.lat, ambulanceLocation.lng]} 
                   zoom={13} 
                   zoomControl={false}
                   style={{ width: '100%', height: '100%' }}
                 >
                   <TileLayer
                     attribution='&copy; OpenStreetMap'
                     url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                   />
                   
                   <Marker position={[ambulanceLocation.lat, ambulanceLocation.lng]} icon={ambulanceLogo}>
                     <Popup className="bg-slate-900 border-none rounded-lg font-bold text-white">Your Location</Popup>
                   </Marker>
                   
                   {activeEmergency && activeEmergency.location && (() => {
                      const [lat, lng] = activeEmergency.location.split(',');
                      return (
                        <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={userIcon}>
                          <Popup className="bg-slate-900 border-none rounded-lg font-bold text-white">Victim</Popup>
                        </Marker>
                      );
                   })()}

                   {routePath && (
                     <Polyline 
                       positions={routePath}
                       pathOptions={{
                         color: '#3b82f6',
                         weight: 5,
                         opacity: 0.8,
                         lineJoin: 'round',
                         lineCap: 'round',
                         dashArray: '10, 10'
                       }}
                     />
                   )}
                 </MapContainer>
               </div>
             )}

             <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-[2rem] shadow-xl backdrop-blur-md space-y-5">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">Victim Details</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Name</p>
                   <p className="text-lg font-bold text-white flex items-center gap-2 mt-1"><User size={16} className="text-blue-400"/> {activeEmergency.name}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contact</p>
                   <a href={`tel:${activeEmergency.phone}`} className="text-lg font-bold text-white flex items-center gap-2 mt-1 hover:text-blue-400 transition-colors"><Phone size={16} className="text-blue-400"/> {activeEmergency.phone}</a>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-slate-800">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin size={14} className="text-emergency-500" /> Exact Coordinates (Lat/Lng)</p>
                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm shadow-inner break-all">
                   {activeEmergency.location}
                 </div>
               </div>

               <div className="pt-6">
                 <button 
                   onClick={handleResolve}
                   className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-4 rounded-xl transition-all border border-slate-600 shadow-inner flex items-center justify-center gap-2"
                 >
                   <CheckCircle2 size={20} /> Resolve Case & Log History
                 </button>
               </div>
             </div>
           </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-lg font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="text-emergency-500" size={20} /> Incoming Pings
              </h2>
              <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm font-bold border border-slate-700 shadow-inner">
                {pendingEmergencies.length} Active
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto pb-20 custom-scrollbar pr-2">
              {loading && pendingEmergencies.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <div className="w-12 h-12 border-4 border-slate-800 border-t-emergency-500 rounded-full animate-spin mb-4"></div>
                  <p className="font-semibold tracking-wide">Scanning local area...</p>
                </div>
              ) : pendingEmergencies.length === 0 ? (
                <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-[2rem] p-12 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <Activity className="text-slate-500 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No active emergencies</h3>
                  <p className="text-slate-500 font-medium max-w-[250px]">Stay on standby. Pings will appear here automatically.</p>
                </div>
              ) : (
                pendingEmergencies.map((ping) => (
                  <div key={ping.id} className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-3xl shadow-lg backdrop-blur-md transform transition-all hover:-translate-y-1 hover:border-emergency-500/50 hover:shadow-emergency-500/10 group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-emergency-500/20 text-emergency-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-emergency-500/20">Critical</span>
                          <span className="text-slate-400 text-xs font-semibold">{new Date(ping.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <h3 className="text-xl font-black text-white">{ping.name}</h3>
                      </div>
                      <a href={`tel:${ping.phone}`} className="w-10 h-10 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-inner">
                        <Phone size={16} />
                      </a>
                    </div>
                    
                    <div className="bg-slate-950/50 rounded-xl p-3 mb-5 border border-slate-800 flex items-start gap-3">
                      <MapPin className="text-emergency-500 mt-0.5 shrink-0" size={16} />
                      <p className="text-sm font-medium text-slate-300 leading-snug break-all">{ping.location}</p>
                    </div>

                    <button 
                      onClick={() => handleAccept(ping.id)}
                      className="w-full bg-emergency-600 hover:bg-emergency-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emergency-600/20 transition-all border border-emergency-500"
                    >
                      <Navigation size={18} /> ACCEPT REQUEST
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
