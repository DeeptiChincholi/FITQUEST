import React, { useState, useEffect } from 'react';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

// Custom map style - Light modern theme
const mapStyle = [
  {
    "featureType": "poi",
    "elementType": "all",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "all",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "all",
    "stylers": [
      {
        "color": "#e9e9e9"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "lightness": 100
      },
      {
        "visibility": "simplified"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  }
];



const PlayerMap = () => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '0.75rem'
  };

  // Simplified - fetch players only once on mount
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/players-location`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch player locations');
      }
      
      const data = await response.json();
      setPlayers(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to load player locations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch players only once when component mounts
  useEffect(() => {
    fetchPlayers();
  }, []);

  // Listen for any relevant changes in localStorage (simplified)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'email') {
        // Only refetch if user changes
        fetchPlayers();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);



  const getMapCenter = () => {
    const loggedInEmail = localStorage.getItem("email");
    const loggedInUser = players.find(player => player.email === loggedInEmail);

    if (loggedInUser) {
      return {
        lat: Number(loggedInUser.latitude),
        lng: Number(loggedInUser.longitude)
      };
    } else if (players.length > 0) {
      return {
        lat: Number(players[0].latitude),
        lng: Number(players[0].longitude)
      };
    }
    return {
      lat: 20,
      lng: 0
    };
  };



  // Add a refresh button for manual updates if needed
  const handleRefresh = () => {
    fetchPlayers();
  };

  if (loadError) return <div className="text-red-500">Error loading maps</div>;
  
  if (!isLoaded || loading) {
    return (
      <div className="w-full h-[500px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">{error}</div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Optional: Add a refresh button for manual updates */}
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Showing {players.length} player{players.length !== 1 ? 's' : ''}
        </span>
        <button 
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="h-[500px] rounded-xl overflow-hidden shadow-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={getMapCenter()}
          zoom={12}
          onLoad={map => setMapRef(map)}
          options={{
            styles: mapStyle,
            streetViewControl: false,
            mapTypeControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_TOP
            },
            fullscreenControl: false,
            gestureHandling: 'greedy',
            backgroundColor: '#f5f5f5'
          }}
        >
          {players.map((player, index) => (
            <Marker
              key={player.email}
              position={{
                lat: Number(player.latitude) + index * 0.00001,
                lng: Number(player.longitude) + index * 0.00001
              }}
              onClick={() => setSelectedPlayer(player)}
              title={player.name}
            />
          ))}

          {selectedPlayer && (
            <InfoWindow
              position={{
                lat: Number(selectedPlayer.latitude),
                lng: Number(selectedPlayer.longitude)
              }}
              onCloseClick={() => setSelectedPlayer(null)}
            >
              <div className="p-2 min-w-[200px]">
                <div className="border-b border-gray-200 pb-2 mb-2">
                  <h3 className="font-medium text-gray-900">{selectedPlayer.name}</h3>
                  <p className="text-sm text-gray-600">{selectedPlayer.email}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex justify-between">
                    <span>Steps:</span>
                    <span className="font-medium">{selectedPlayer.steps?.toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Calories:</span>
                    <span className="font-medium">{selectedPlayer.calories?.toFixed(0)}</span>
                  </p>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default PlayerMap;