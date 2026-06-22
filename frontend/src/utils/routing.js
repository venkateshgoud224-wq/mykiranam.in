// Haversine distance formula (in km)
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fetch single road distance using OSRM Route service
export const fetchRoadDistance = async (lat1, lon1, lat2, lon2) => {
  const fallbackVal = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  
  try {
    // 2.5 second timeout for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const roadDist = data.routes[0].distance / 1000; // OSRM returns meters, convert to km
        return {
          distance: parseFloat(roadDist.toFixed(2)),
          isRoad: true
        };
      }
    }
  } catch (err) {
    console.warn('OSRM Route API failed, using Haversine fallback:', err);
  }
  
  return {
    distance: parseFloat(fallbackVal.toFixed(2)),
    isRoad: false
  };
};

// Fetch road distances for multiple destinations using OSRM Table service
export const fetchRoadDistanceMatrix = async (userLat, userLng, destinations) => {
  // destinations is an array of objects with { latitude, longitude, id }
  if (!destinations || destinations.length === 0) return [];
  
  // Initialize all results with Haversine distance
  const results = destinations.map(dest => {
    const havDist = calculateHaversineDistance(userLat, userLng, parseFloat(dest.latitude), parseFloat(dest.longitude));
    return {
      id: dest.id,
      distance: parseFloat(havDist.toFixed(2)),
      isRoad: false
    };
  });
  
  try {
    // Construct coordinate string: user first, then destinations
    // Format: lon0,lat0;lon1,lat1;lon2,lat2...
    const coordsString = [
      `${userLng},${userLat}`,
      ...destinations.map(dest => `${dest.longitude},${dest.latitude}`)
    ].join(';');
    
    // OSRM Table API request with sources=0 (user is the source)
    const url = `https://router.project-osrm.org/table/v1/driving/${coordsString}?sources=0`;
    
    // 3 second timeout for table request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.distances && data.distances[0]) {
        // data.distances[0] is array: [0 (dist to self), dist to dest1, dist to dest2, ...]
        const osrmDistances = data.distances[0];
        
        for (let i = 0; i < destinations.length; i++) {
          const indexInOsrm = i + 1; // Since index 0 is the user
          const distInMeters = osrmDistances[indexInOsrm];
          
          if (distInMeters !== null && distInMeters !== undefined) {
            results[i] = {
              id: destinations[i].id,
              distance: parseFloat((distInMeters / 1000).toFixed(2)),
              isRoad: true
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('OSRM Table API failed, using Haversine fallback:', err);
  }
  
  return results;
};
