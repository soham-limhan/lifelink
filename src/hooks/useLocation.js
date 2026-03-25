import { useState, useEffect } from 'react';

const FALLBACK_LOCATION = { lat: 19.0760, lng: 72.8777 }; // Mumbai fallback

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocation(FALLBACK_LOCATION);
      setLoading(false);
      return;
    }

    // Strict 5 second timeout for emergency scenario
    const fallbackTimer = setTimeout(() => {
      if (loading) {
         setError('Location request timed out, using fallback');
         setLocation(FALLBACK_LOCATION);
         setLoading(false);
      }
    }, 5000);

    const watcherId = navigator.geolocation.watchPosition(
      (position) => {
        clearTimeout(fallbackTimer);
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
      },
      (err) => {
        clearTimeout(fallbackTimer);
        setError('Unable to retrieve location: ' + err.message);
        setLocation(FALLBACK_LOCATION);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watcherId);
    };
  }, [loading]);

  return { location, error, loading };
};
