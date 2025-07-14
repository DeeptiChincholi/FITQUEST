import React, { useState, useEffect } from 'react';
import TokenCashing from './TokenCashout';
import { ArrowLeft } from 'lucide-react';

// Custom Card component
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#1a1b23] rounded-xl p-6 shadow-lg border border-gray-800 ${className}`}>
    {children}
  </div>
);

// Challenge Progress Component
const ChallengeProgress = ({ challenge, userEmail }) => {
  const [progress, setProgress] = useState({ challengerSteps: 0, recipientSteps: 0 });

  useEffect(() => {
    const updateProgress = async () => {
      const steps = parseInt(localStorage.getItem('currentSteps') || '0');

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update-challenge-steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: challenge._id,
            userEmail,
            currentSteps: steps
          })
        });

        const data = await res.json();
        setProgress({
          challengerSteps: data.challenge.challengerSteps,
          recipientSteps: data.challenge.recipientSteps
        });

        if (data.completed) {
          const isWinner = data.winner === userEmail;
          alert(`🎉 Challenge complete! ${isWinner ? "You won!" : "You lost!"}`);
        }

      } catch (err) {
        console.error("Challenge update error:", err);
      }
    };

    const today = new Date().setHours(0, 0, 0, 0);
    const challengeDate = new Date(challenge.date).setHours(0, 0, 0, 0);

    if (challenge.status === "accepted" && challengeDate === today) {
      updateProgress();
      const interval = setInterval(updateProgress, 60000); // every minute
      return () => clearInterval(interval);
    }
  }, [challenge, userEmail]);

  const targetSteps = challenge.steps;
 const challengerProgress = (progress.challengerSteps / targetSteps) * 100;
const recipientProgress = (progress.recipientSteps / targetSteps) * 100;


 return (
  <div className="mt-4">
    <h4 className="text-sm font-semibold mb-2">Challenge Progress</h4>
    <div className="space-y-2">
      {userEmail === challenge.challenger && (
        <div>
          <p className="text-xs text-gray-400">
            {challenge.challengerName} ({progress.challengerSteps}/{targetSteps} steps)
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(challengerProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {localStorage.getItem("email") === challenge.recipient && (
        <div>
          <p className="text-xs text-gray-400">
            {challenge.recipientName} ({progress.recipientSteps}/{targetSteps} steps)
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(recipientProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};


const ProfilePage = () => {
  // State declarations
  const [tokens, setTokens] = useState({ today: 0, total: 0 });
  const [stepsGoal, setStepsGoal] = useState(() => {
    return parseInt(localStorage.getItem('stepsGoal')) || 5000;
  });
  const [challengeRequests, setChallengeRequests] = useState([]);
  const [pastChallenges, setPastChallenges] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCashout, setShowCashout] = useState(false);
  const userEmail = localStorage.getItem('email');

  // Challenge handling functions
  const handleAccept = async (challenge) => {
    console.log("Challenge ID:", challenge._id); // Debugging
  
    if (!challenge._id) {
      console.error("Error: challenge._id is undefined");
      return;
    }
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/accept-challenge/${challenge._id}`, {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (response.ok) {
        setPastChallenges(prev => [...prev, { ...challenge, status: 'accepted' }]);
        setChallengeRequests(prev => prev.filter(req => req._id !== challenge._id));
      } else {
        console.error("Error: Server response not OK");
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
    }
  };
  
  const handleDecline = async (challenge) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/decline-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge._id }),
      });

      if (response.ok) {
        setChallengeRequests((prev) => prev.filter((req) => req._id !== challenge._id));
        console.log("Challenger (A) has been notified about the decline.");
      } else {
        console.error("Error: Decline request failed.");
      }
    } catch (error) {
      console.error('Error declining challenge:', error);
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    try {
      const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/delete-challenge/${challengeId}/${userEmail}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setPastChallenges(prev => prev.filter(c => c._id !== challengeId));
      }
    } catch (error) {
      console.error('Error deleting challenge:', error);
    }
  };

  const handleDeleteAllCompleted = async () => {
    try {
      const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/delete-all-completed/${userEmail}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setPastChallenges(prev => prev.filter(c => c.status !== 'completed'));
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting all completed challenges:', error);
    }
  };

  // Data fetching functions
  const fetchTokens = async () => {
    const email = localStorage.getItem('email');
    if (email) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user-tokens/${email}`);
        if (response.ok) {
          const data = await response.json();
          setTokens({
            today: data.todayTokens,
            total: data.totalTokens
          });
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    }
  };

const fetchChallenges = async () => {
  const email = localStorage.getItem('email');
  if (email) {
    try {
      // Fetch incoming challenges (as recipient)
      const responsePending = await fetch(`${import.meta.env.VITE_API_BASE_URL}/incoming-challenges/${email}`);
      if (responsePending.ok) {
        const challenges = await responsePending.json();
        setChallengeRequests(challenges);
      }

      // Fetch accepted challenges (as recipient)
      const responseAccepted = await fetch(`${import.meta.env.VITE_API_BASE_URL}/upcoming-challenges/${email}`);
      const recipientChallenges = await responseAccepted.ok ? await responseAccepted.json() : [];

      // Fetch challenges where user is challenger
      const responseChallenger = await fetch(`${import.meta.env.VITE_API_BASE_URL}/challenger-challenges/${email}`);
      const challengerChallenges = await responseChallenger.ok ? await responseChallenger.json() : [];

      // FIXED: Apply filtering and then set the state
      const filteredChallenges = [...recipientChallenges, ...challengerChallenges]
        .filter(challenge => 
          challenge.status !== 'declined' && 
          (!challenge.deletedFor || !challenge.deletedFor.includes(userEmail))
        );
      
      setPastChallenges(filteredChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }
};

  // useEffect hook for data fetching and intervals
  useEffect(() => {
    fetchTokens();
    fetchChallenges();

    const interval = setInterval(() => {
      fetchTokens();
      fetchChallenges();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Helper function for decline accepted challenge
  const handleDeclineAccepted = async (challengeId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/decline-accepted-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challengeId,
          userEmail
        })
      });

      if (response.ok) {
        setPastChallenges(prev => prev.filter(c => c._id !== challengeId));
      } else {
        const data = await response.json();
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error declining accepted challenge:', error);
    }
  };

  // Render function
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tokens Card */}
          <Card>
            {!showCashout ? (
            <div>  
            <h2 className="text-xl font-semibold mb-4">Tokens Earned</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="ml-4">
                    <span className="text-3xl font-bold">{tokens.today}</span>
                    <p className="text-gray-400">Today's Tokens</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Tokens Earned</span>
                  <span className="text-2xl font-bold mr-5">{tokens.total}</span>
                </div>
              </div>
              <div className="text-sm">
              <div className="flex items-center justify-between">
                <div>
                <p>• Earn 10 tokens per 1,000 steps</p>
                <p>• Earn 10 tokens per 500 calories burned</p></div>
                <button onClick={() => setShowCashout(true)} className="px-4 py-2 bg-purple-600 rounded-lg">Cash Out 💰</button>                
              </div>
              </div>
            </div>
            </div> ) : (
                <div>
              <button onClick={() => setShowCashout(false)} className="text-gray-400 hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <TokenCashing/>
              </div>
              )}
          </Card>

          {/* Daily Steps Goal Card */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Daily Steps Goal</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-lg font-medium">{stepsGoal.toLocaleString()} steps</span>
              </div>
              <div className="relative py-4">
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={stepsGoal}
                  onChange={(e) => {
                    const newGoal = Math.round(Number(e.target.value) / 100) * 100;
                    setStepsGoal(newGoal);
                    localStorage.setItem('stepsGoal', newGoal);
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
                    before:absolute before:top-1/2 before:-translate-y-1/2 before:h-1 before:bg-purple-600 before:rounded-full
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:relative
                    [&::-webkit-slider-thumb]:w-6
                    [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:bg-purple-600
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-4
                    [&::-webkit-slider-thumb]:border-gray-800
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing
                    [&::-webkit-slider-thumb]:hover:bg-purple-500
                    [&::-webkit-slider-thumb]:transition-colors
                    [&::-moz-range-thumb]:w-6
                    [&::-moz-range-thumb]:h-6
                    [&::-moz-range-thumb]:bg-purple-600
                    [&::-moz-range-thumb]:border-4
                    [&::-moz-range-thumb]:border-gray-800
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:shadow-lg
                    [&::-moz-range-thumb]:cursor-grab
                    [&::-moz-range-thumb]:active:cursor-grabbing
                    [&::-moz-range-thumb]:hover:bg-purple-500
                    [&::-moz-range-thumb]:transition-colors"
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>500</span>
                <span>5,000</span>
                <span>10,000</span>
              </div>
            </div>
          </Card>

          {/* Incoming Challenges Card */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Incoming Challenges</h2>
            {challengeRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <span className="text-4xl mb-4 block">🤝</span>
                <p>No incoming challenges</p>
              </div>
            ) : (
              <div className="space-y-4">
                {challengeRequests.map((request) => (
                  <div key={request._id} className="flex items-center justify-between">
                    <div>
                      Heyy!! You are challenged <br/> 
                      Challenger: {request.challengerName} <br/> 
                      Steps: {request.steps} <br/> 
                      Tokens on Stake: {request.tokens} <br/> 
                      Challenge Date: {request.date.split('T')[0]}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(request)} className="px-4 py-2 bg-purple-600 rounded-lg">Accept</button>
                      <button onClick={() => handleDecline(request)} className="px-4 py-2 bg-gray-700 rounded-lg">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Challenge History Card */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Challenge History</h2>
              {pastChallenges.some(c => c.status === 'completed') && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Delete All Completed
                </button>
              )}
            </div>
            {pastChallenges.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <span className="text-4xl mb-4 block">📜</span>
                <p>No past or ongoing challenges</p>
              </div>
            ) : (
              <div className="h-96 overflow-y-auto scrollbar-hide space-y-4" style={{ scrollBehavior: 'smooth' }}>
                {[...pastChallenges]
                  .sort((a, b) => {
                    // Custom sorting function
                    const getStatusPriority = (status) => {
                      switch (status) {
                        case 'ongoing': return 1;
                        case 'accepted': return 2;
                        case 'completed': return 3;
                        default: return 4;
                      }
                    };
                    
                    // First sort by status priority
                    const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
                    if (statusDiff !== 0) return statusDiff;
                    
                    // Then sort by date (newer first)
                    return new Date(b.date) - new Date(a.date);
                  })
                  .map((challenge) => {
                    const isChallenger = challenge.challenger === userEmail;
                    const challengeDate = new Date(challenge.date).setHours(0, 0, 0, 0);
                    const today = new Date().setHours(0, 0, 0, 0);
                    const isToday = challengeDate === today;
                    const isFutureDate = challengeDate > today;

                    return (
                      <div 
                        key={challenge._id} 
                        className="p-4 bg-gray-800 rounded-lg transition-all duration-300 hover:bg-gray-700"
                      >
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                            {isChallenger ? (
          <p>Your Challenge has been accepted by {challenge.recipientName}!</p>
        ) : (
          <p>You accepted a challenge from {challenge.challengerName}</p>
        )}
                              <h3 className="font-semibold">Steps: {challenge.steps}</h3>
                              <h3 className="font-semibold">Tokens at stake: {challenge.tokens}</h3>
                              <p className="text-sm text-gray-400">Challenge On: {challenge.date.split('T')[0]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                challenge.status === 'completed' 
                                  ? challenge.winner === userEmail 
                                    ? 'bg-green-900 text-green-300' 
                                    : 'bg-red-900 text-red-300'
                                  : challenge.status === 'ongoing' 
                                    ? 'bg-blue-900 text-blue-300' 
                                    : 'bg-gray-900 text-gray-300'
                              }`}>
                                {challenge.status === 'completed' 
                                  ? challenge.winner === userEmail 
                                    ? 'Won' 
                                    : 'Lost'
                                  : challenge.status}
                              </span>
                              {challenge.status === 'accepted' && isFutureDate && (
                                <button
                                  onClick={() => handleDeclineAccepted(challenge._id)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-transform hover:scale-105"
                                >
                                  Decline
                                </button>
                              )}
                              {challenge.status === 'completed' && (
                                <button
                                  onClick={() => handleDeleteChallenge(challenge._id)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          {challenge.status === 'accepted' && isToday && (
                            <ChallengeProgress challenge={challenge} userEmail={userEmail} />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete All Completed Challenges?</h3>
            <p className="text-gray-300 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllCompleted}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;