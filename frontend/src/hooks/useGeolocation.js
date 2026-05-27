import { useState, useEffect } from 'react';

// Default Location Coordinates (New Delhi, India)
export const DEFAULT_COORDS = {
  latitude: 28.6139,
  longitude: 77.2090,
  address: "New Delhi"
};

export const useGeolocation = () => {
  const [coords, setCoords] = useState(() => {
    const cached = localStorage.getItem('user_coords');
    return cached ? JSON.parse(cached) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!coords);

  const fetchLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setCoords(DEFAULT_COORDS);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: "Current GPS Location"
        };
        localStorage.setItem('user_coords', JSON.stringify(newCoords));
        setCoords(newCoords);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.warn("GPS location failed. Using fallback.", err.message);
        setError("Location permission denied. Centered in New Delhi.");
        if (!coords) {
          setCoords(DEFAULT_COORDS);
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (!coords) {
      fetchLocation();
    }
  }, []);

  const manualSetCoordinates = (latitude, longitude, name = "Custom Location") => {
    const customCoords = { latitude, longitude, address: name };
    localStorage.setItem('user_coords', JSON.stringify(customCoords));
    setCoords(customCoords);
    setError(null);
  };

  return {
    coords,
    error,
    loading,
    refresh: fetchLocation,
    setCoords: manualSetCoordinates
  };
};
