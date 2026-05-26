import { useState, useEffect } from 'react';

// Default Location Coordinates centered on HSR Layout, Bangalore
export const DEFAULT_COORDS = {
  latitude: 12.9141,
  longitude: 77.6413,
  address: "HSR Layout, Bangalore"
};

// Preset fallback Bangalore markets for simulated manual coordinates selection
export const FALLBACK_MARKETS = [
  { name: "HSR Layout Sec 2 (Club Road)", latitude: 12.9105, longitude: 77.6450 },
  { name: "HSR Layout Sec 6 (Main Road)", latitude: 12.9185, longitude: 77.6390 },
  { name: "Koramangala 4th Block", latitude: 12.9315, longitude: 77.6295 },
  { name: "Indiranagar 100ft Road", latitude: 12.9640, longitude: 77.6385 },
  { name: "Sarjapur Outer Ring Road", latitude: 12.9220, longitude: 77.6740 }
];

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
        console.warn("GPS location failed. Using Bangalore HSR Layout fallback.", err.message);
        setError("Location permission denied. Centered in HSR Layout.");
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
