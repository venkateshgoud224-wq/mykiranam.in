import { useState, useEffect } from 'react';

// Default Location Coordinates (Telangana)
export const DEFAULT_COORDS = {
  latitude: 16.8970,
  longitude: 79.8705,
  address: "Telangana"
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
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let addressName = "Current GPS Location";

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await response.json();
          if (data) {
            addressName = data.display_name || (data.address ? (data.address.neighbourhood || data.address.suburb || data.address.city || data.address.town || data.address.village || data.address.county) : null) || "Current GPS Location";
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        }

        const newCoords = {
          latitude: lat,
          longitude: lon,
          address: addressName
        };
        localStorage.setItem('user_coords', JSON.stringify(newCoords));
        setCoords(newCoords);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.warn("GPS location failed. Using fallback.", err.message);
        setError("Location permission denied. Centered in Telangana.");
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
