import React, { useState, useEffect } from 'react';

const UserStatsPopup = ({ user, isVisible, onClose }) => {
  const [tokenData, setTokenData] = useState({ todayTokens: 0, totalTokens: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      if (user && user.email) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user-tokens/${user.email}`);
          if (response.ok) {
            const data = await response.json();
            setTokenData(data);
          }
        } catch (error) {
          console.error('Error fetching token data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (isVisible) {
      fetchTokenData();
    }
  }, [user, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="absolute  w-64 rounded-xl bg-gray-900/95 border border-gray-800 backdrop-blur-lg shadow-xl animate-fade-in z-50 top-0 left-0"
      style={{zIndex:1000}}
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-100">{user.name}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400">Today's Steps</span>
            <span className="text-gray-100 font-medium">{user.steps.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400">Today's Calories</span>
            <span className="text-gray-100 font-medium">{parseFloat(user.calories).toFixed(0)}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400">Today's Tokens</span>
            <div className="flex items-center">
              <span className="text-gray-100 font-medium">{tokenData.todayTokens}</span>
              <span className="ml-1 text-lg">🏆</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">Total Tokens</span>
            <div className="flex items-center">
              <span className="text-gray-100 font-medium">{tokenData.totalTokens}</span>
              <span className="ml-1 text-lg">🏆</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-gray-900/95 rounded-xl flex items-center justify-center">
            <div className="text-gray-400">Loading tokens...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStatsPopup;