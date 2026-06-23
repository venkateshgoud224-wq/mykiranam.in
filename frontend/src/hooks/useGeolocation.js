import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Default Location Coordinates (Telangana)
export const DEFAULT_COORDS = {
  latitude: 16.8970,
  longitude: 79.8705,
  address: "Telangana"
};

export const useGeolocation = () => {
  const { user, token, apiUrl, refreshProfile } = useAuth();
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

        // Sync automatically fetched coordinates to the backend database
        if (token && user) {
          if (user.role === 'seller') {
            fetch(`${apiUrl}/shops/settings`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: lat,
                longitude: lon,
                address: addressName
              })
            }).then(res => {
              if (res.ok && refreshProfile) refreshProfile();
            }).catch(err => console.error('Failed to sync shop location:', err));
          } else if (user.role === 'customer') {
            fetch(`${apiUrl}/auth/location`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: lat,
                longitude: lon,
                address: addressName
              })
            }).then(res => {
              if (res.ok && refreshProfile) refreshProfile();
            }).catch(err => console.error('Failed to sync customer location:', err));
          }
        }
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
    } else if (token && user && coords && coords.address !== 'Telangana') {
      // Sync cached location to database on startup for returning (old) users
      const syncCachedLocation = async () => {
        try {
          if (user.role === 'seller') {
            await fetch(`${apiUrl}/shops/settings`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: coords.latitude,
                longitude: coords.longitude,
                address: coords.address
              })
            });
          } else if (user.role === 'customer') {
            const res = await fetch(`${apiUrl}/auth/location`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: coords.latitude,
                longitude: coords.longitude,
                address: coords.address
              })
            });
            if (res.ok && refreshProfile) refreshProfile();
          }
        } catch (err) {
          console.error('Failed to sync cached location on startup:', err);
        }
      };
      syncCachedLocation();
    }
  }, [token, user]);

  const manualSetCoordinates = async (latitude, longitude, name = "Custom Location") => {
    const customCoords = { latitude, longitude, address: name };
    localStorage.setItem('user_coords', JSON.stringify(customCoords));
    setCoords(customCoords);
    setError(null);

    // Sync manually chosen coordinates to the backend database
    if (token && user) {
      try {
        if (user.role === 'seller') {
          const res = await fetch(`${apiUrl}/shops/settings`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude,
              longitude,
              address: name
            })
          });
          if (res.ok && refreshProfile) refreshProfile();
        } else if (user.role === 'customer') {
          const res = await fetch(`${apiUrl}/auth/location`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude,
              longitude,
              address: name
            })
          });
          if (res.ok && refreshProfile) refreshProfile();
        }
      } catch (err) {
        console.error('Failed to sync manual location:', err);
      }
    }
  };

  return {
    coords,
    error,
    loading,
    refresh: fetchLocation,
    setCoords: manualSetCoordinates
  };
};
