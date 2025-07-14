import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

// Custom Card component
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#1a1b23] rounded-xl p-6 shadow-lg border border-gray-800 ${className}`}>
    {children}
  </div>
);

const TokenCashing = () => {
  const [tokensToRedeem, setTokensToRedeem] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userEmail = localStorage.getItem('email');

  useEffect(() => {
    fetchTokens();
    fetchPaymentHistory();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user-tokens/${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setTotalTokens(data.totalTokens);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payment-history/${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const handleCashout = async () => {
    if (tokensToRedeem <= 0) {
      setError('Please enter a valid number of tokens');
      return;
    }

    if (tokensToRedeem > totalTokens) {
      setError('Insufficient tokens');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cashout-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, tokensToRedeem }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully redeemed ${tokensToRedeem} tokens for ₹${(tokensToRedeem * 0.1).toFixed(2)}`);
        setTotalTokens(data.remainingTokens);
        setTokensToRedeem(0);
        fetchPaymentHistory();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to process cashout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold mb-4">Cash Out Tokens</h2>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Available Tokens:</span>
            <span className="font-semibold">{totalTokens}</span>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm">Tokens to Redeem</label>
            <input
              type="number"
              value={tokensToRedeem}
              onChange={(e) => setTokensToRedeem(Math.max(0, parseInt(e.target.value) || ''))}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg"
              min="0"
              max={totalTokens}
            />
            <p className="text-sm text-gray-400">
              You will receive: ₹{(tokensToRedeem * 0.1).toFixed(2)}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="text-green-400 text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleCashout}
            disabled={isLoading || tokensToRedeem <= 0}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            {isLoading ? 'Processing...' : 'Cash Out'}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        <div className="space-y-4">
          {paymentHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No payment history yet</p>
          ) : (
            paymentHistory.map((payment, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm text-gray-300">Redeemed {payment.tokens} tokens</p>
                  <p className="text-xs text-gray-400">
                    {new Date(payment.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{payment.amount}</p>
                  <p className="text-xs text-gray-400">ID: {payment.transactionId}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default TokenCashing;