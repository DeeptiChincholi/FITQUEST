import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const GoogleFitComponent = () => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('googleFitToken'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('googleFitRefreshToken'));
  const [fitnessData, setFitnessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const login = useGoogleLogin({
    flow: 'auth-code',
    // redirect_uri: 'https://fitquest-01.vercel.app',  //comment this for local
    // redirect_uri: 'http://localhost:5175',  //comment this for local
    redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URI,
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    onSuccess: async (codeResponse) => {
      try {
        const tokens = await exchangeAuthCode(codeResponse.code);
        console.log("codeResponse", codeResponse);

        localStorage.setItem('googleFitToken', tokens.access_token);
        localStorage.setItem('googleFitRefreshToken', tokens.refresh_token);
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
      } catch (err) {
        console.error('Token exchange failed:', err);
        setError('Failed to complete Google Fit connection');
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      setError('Failed to login to Google Fit');
    },
  });

  const exchangeAuthCode = async (code) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/exchange-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    console.log("Exchange Code Response Status:", response.status);

    const text = await response.text();
    console.log("Exchange Code Response Text:", text);

    if (!response.ok) {
      throw new Error('Failed to exchange auth code');
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error('Failed to parse JSON from token exchange response');
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('googleFitToken', data.access_token);
      setAccessToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleDisconnect();
      throw error;
    }
  };

  // Simplified - only update location once when user first connects
  const updateUserLocationOnce = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const email = localStorage.getItem('email');
            console.log('Sending initial location update:', {
              email,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update-location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
  
            if (!response.ok) {
              throw new Error('Failed to update location');
            }
            
            const data = await response.json();
            console.log('Location update response:', data);
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const saveFitnessDataToDB = async (email, steps, calories, name) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/save-fitness-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, steps, calories, name }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to save data to the database");
      }
      console.log("Fitness data saved to database");
    } catch (err) {
      console.error("Error saving data to DB:", err);
    }
  };

  const fetchFitnessData = async (token = accessToken) => {
    if (!token) return;

    setLoading(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const startTime = startOfDay.getTime();
      const endTime = now.getTime();

      console.log("Current IST Time:", new Date().toString());
      console.log("StartTime (IST):", new Date(startTime).toString());
      console.log("EndTime (IST):", new Date(endTime).toString());

      const stepsResponse = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime,
          endTimeMillis: endTime,
        }),
      }
    );

       if (stepsResponse.status === 401 && refreshToken) {
      const newToken = await refreshAccessToken();
      return fetchFitnessData(newToken); // retry with new token
    }

    if (!stepsResponse.ok) {
      throw new Error(`HTTP error! status: ${stepsResponse.status}`);
    }


       const stepsData = await stepsResponse.json();
    let steps = 0;

    if (stepsData.bucket) {
      stepsData.bucket.forEach((bucket) => {
        bucket.dataset.forEach((dataset) => {
          dataset.point.forEach((point) => {
            point.value.forEach((value) => {
              if (value.intVal) {
                steps += value.intVal;
              }
            });
          });
        });
      });
    }

   
      const caloriesRes = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: "com.google.calories.expended" }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: startTime,
            endTimeMillis: endTime,
          }),
        }
      );

      const caloriesData = await caloriesRes.json();
      let calories = 0;

      if (caloriesData.bucket) {
        caloriesData.bucket.forEach((bucket) => {
          bucket.dataset.forEach((dataset) => {
            dataset.point.forEach((point) => {
              point.value.forEach((value) => {
                if (value.fpVal) {
                  calories += value.fpVal;
                }
              });
            });
          });
        });
      }

      if (steps === 0 && calories === 0) {
        setError(
          "No fitness data found for the last 24 hours. If you just set up Google Fit, please wait a few hours for data to sync."
        );
      } else {
        const userInfo = await fetchGoogleUserInfo(token);
        if (!userInfo) {
          setError("Failed to fetch user info.");
          return;
        }

        const { email, name } = userInfo;
        localStorage.setItem("email", email);
        localStorage.setItem("name", name);

        await saveFitnessDataToDB(email, steps, calories, name);
        setFitnessData({
          steps: steps,
          calories: Math.round(calories),
        });
        localStorage.setItem("currentSteps",steps);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Error fetching fitness data: ${err.message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      const data = await response.json();
      console.log("User Info:", data);
  
      return { email: data.email, name: data.name };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  };

  // Simplified useEffect - only update location once when user first connects
  useEffect(() => {
    if (accessToken) {
      // Initial fetch and one-time location update
      fetchFitnessData();
      updateUserLocationOnce(); // Get location only once when first connecting

      // Only set up interval for fitness data updates (hourly)
      const fitnessInterval = setInterval(fetchFitnessData, 60 * 60 * 1000);

      return () => {
        clearInterval(fitnessInterval);
      };
    }
  }, [accessToken]);

  const handleDisconnect = () => {
    localStorage.removeItem('googleFitToken');
    localStorage.removeItem('googleFitRefreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setFitnessData(null);
    setError(null);
    setLastUpdated(null);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFitnessData(accessToken);
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString();
  };

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <button
          onClick={() => login()}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.607,1.972-2.101,3.467-4.073,4.073v-3.536 c0-1.054-0.855-1.909-1.909-1.909h0c-1.054,0-1.909,0.855-1.909,1.909v3.536c-1.972-0.607-3.467-2.101-4.073-4.073h3.536 c1.054,0,1.909-0.855,1.909-1.909v0c0-1.054-0.855-1.909-1.909-1.909H5.016c0.607-1.972,2.101-3.467,4.073-4.073v3.536 c0,1.054,0.855,1.909,1.909,1.909h0c1.054,0,1.909-0.855,1.909-1.909V6.169c1.972,0.607,3.467,2.101,4.073,4.073h-3.536 C13.4,10.242,12.545,11.097,12.545,12.151z"/>
          </svg>
          Connect with Google Fit
        </button>
      </div>
    );
  }

  if (loading && !fitnessData) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isRefreshing) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium mb-2">Unable to Load Fitness Data</h3>
          <p className="text-yellow-700">{error}</p>
          <button
            onClick={handleDisconnect}
            className="mt-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded hover:bg-yellow-200"
          >
            Disconnect and Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-2xl text-blue-700">
            {fitnessData?.steps.toLocaleString()}
          </h3>
          <p className="text-blue-600">Steps Today</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-2xl text-green-700">
            {fitnessData?.calories.toLocaleString()}
          </h3>
          <p className="text-green-600">Calories Burned</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-gray-600">Last Updated: {formatLastUpdated(lastUpdated)}</p>
        <div className='flex justify-between'>
          <button
            onClick={handleRefresh}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Refresh Data
          </button>
         
          <button
            onClick={handleDisconnect}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Disconnect Google Fit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleFitComponent;