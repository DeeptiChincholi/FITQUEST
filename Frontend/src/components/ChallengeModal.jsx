import React, { useState } from 'react';

const ChallengeModal = ({ isOpen, onClose, onSubmit, selectedUser }) => {
  const [challengeDetails, setChallengeDetails] = useState({
    date: '',
    steps: '',
    tokens: ''
  });

  const [isDateFocused, setIsDateFocused] = useState(false); // Track focus state

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChallengeDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(challengeDetails);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div className="bg-black p-6 rounded-lg shadow-lg w-80 text-center">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">Challenge <span className='text-fuchsia-600 font-medium'>{selectedUser?.name}</span></h2>

        
        <input
          name="date"
          type={isDateFocused ? 'date' : 'text'}
          placeholder="Enter Date"
          value={challengeDetails.date}
          onFocus={() => setIsDateFocused(true)}
          onBlur={() => setIsDateFocused(challengeDetails.date !== '')}
          onChange={handleChange}
          className="w-full p-2 mb-3 border rounded text-white"
        />

        <input
          name="steps"
          type="number"
          placeholder="Enter Steps"
          onChange={handleChange}
          className="w-full p-2 mb-3 border rounded text-white"
        />

        <input
          name="tokens"
          type="number"
          placeholder="Enter Tokens"
          onChange={handleChange}
          className="w-full p-2 mb-3 border rounded text-white"
        />

        <button 
          onClick={handleSubmit} 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded m-2"
        >
          Send Challenge
        </button>
        <button 
          onClick={onClose} 
          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white py-2 px-4 rounded m-2"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }
};

export default ChallengeModal;
