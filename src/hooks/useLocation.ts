import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { LocationCoords } from '../types/weather';

interface UseLocationReturn {
  coords: LocationCoords | null;
  locationName: string;
  error: string | null;
  loading: boolean;
}

export function useLocation(enabled: boolean = true): UseLocationReturn {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Reverse geocode for city name
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (place) {
          setLocationName(place.city || place.subregion || place.region || 'Unknown');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to get location');
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { coords, locationName, error, loading };
}
