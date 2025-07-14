import express from "express";
import User from "./User.js";
import cors from "cors";
import fetch from "node-fetch";
import mongoose from 'mongoose';
import Challenge from "./Challenge.js";

import dotenv from "dotenv";
dotenv.config();


const MONGO_URI = process.env.MONGO_URI
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

const app = express();
app.use(cors());
// app.use(cors({
//   origin: ['https://fitquest-01.vercel.app'], // or '*' for testing
//   credentials: true
// }));

// app.use(cors()); //remove this while deploying 

app.use(express.json());

const YOUR_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const YOUR_GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const YOUR_REDIRECT_URI = process.env.REDIRECT_URI

// Add the new route to save the user data
// Modify the save-fitness-data endpoint in server.js
app.post('/save-fitness-data', async (req, res) => {
  const { email, steps, calories, name } = req.body;

  try {
    let user = await User.findOne({ email });
    
    // Calculate tokens
    const stepsTokens = Math.floor(steps / 1000) * 10;
    const caloriesTokens = Math.floor(calories / 500) * 10;
    const todayTokens = stepsTokens + caloriesTokens;

    if (user) {
      // Update existing user
      const oldTodayTokens = user.todayTokens || 0;
      user.steps = steps;
      user.calories = calories;
      user.name = name;
      user.todayTokens = todayTokens;
      
      // Only add to totalTokens if today's tokens have increased
      if (todayTokens > oldTodayTokens) {
        user.totalTokens = (user.totalTokens || 0) + (todayTokens - oldTodayTokens);
      }
    } else {
      // Create new user
      user = new User({
        name,
        email,
        steps,
        calories,
        todayTokens,
        totalTokens: todayTokens
      });
    }

    await user.save();
    res.status(200).json({ 
      message: 'User data saved successfully!',
      todayTokens,
      totalTokens: user.totalTokens
    });
  } catch (error) {
    console.error('Error saving fitness data:', error);
    res.status(500).json({ error: 'Failed to save fitness data' });
  }
});

  
// Exchange Auth Code for Tokens
app.post('/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: YOUR_GOOGLE_CLIENT_ID,
        client_secret: YOUR_GOOGLE_CLIENT_SECRET,
        redirect_uri: YOUR_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    console.log('Token Exchange Data:', data); // For debugging
    res.json(data);
  } catch (error) {
    console.error('Error exchanging code:', error);
    res.status(500).json({ error: 'Failed to exchange auth code' });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running. MongoDB is connected.");
});


app.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find().sort({ steps: -1 });

    // Assign ranks based on sorted order
    const leaderboard = users.map((user, index) => ({
      name: user.name,  // Show name instead of email
      email: user.email, // Keep email (for frontend identification)
      steps: user.steps,
      calories: user.calories,
      rank: index + 1
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Add this to your server.js
app.post('/update-location', async (req, res) => {
  const { email, latitude, longitude } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (user) {
      user.latitude = latitude;
      user.longitude = longitude;
      await user.save();
      res.status(200).json({ message: 'Location updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Add this endpoint to get players' locations
app.get('/players-location', async (req, res) => {
  try {
    const users = await User.find({
      latitude: { $exists: true },
      longitude: { $exists: true }
    });
    
    console.log('Found users with location:', users.length);
    
    const playersLocation = users.map(user => ({
      email: user.email,
      name: user.name,
      latitude: user.latitude,
      longitude: user.longitude,
      steps: user.steps,
      calories: user.calories,
      profilePicture: user.profilePicture,
    }));
    
    console.log('Sending players location:', playersLocation);
    res.json(playersLocation);
  } catch (error) {
    console.error('Error fetching players location:', error);
    res.status(500).json({ error: 'Failed to fetch players location' });
  }
});


// Refresh Access Token
app.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token,
        client_id: YOUR_GOOGLE_CLIENT_ID,
        client_secret: YOUR_GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    console.log('Refresh Token Data:', data); // For debugging
    res.json(data);
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});
app.post('/challenge', async (req, res) => {
  const { 
    challenger,
    challengerName,    // Add this
    recipient,
    recipientName,     // Add this
    challengeType,
    date,
    steps,
    tokens 
  } = req.body;

  try {
    // Check if there's already a pending challenge between these users
    const existingChallenge = await Challenge.findOne({
      $or: [
        { challenger, recipient, status: 'pending' },
        { challenger: recipient, recipient: challenger, status: 'pending' }
      ]
    });

    if (existingChallenge) {
      return res.status(400).json({ 
        error: 'A pending challenge already exists between these users' 
      });
    }

    const newChallenge = new Challenge({
      challenger,
      challengerName,    // Add this
      recipient,
      recipientName,     // Add this
      challengeType,
      date,
      steps,
      tokens,
      status: 'pending'
    });

    await newChallenge.save();
    res.status(201).json({ 
      message: 'Challenge created successfully!', 
      challenge: newChallenge 
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

app.get('/pending-challenges/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const pendingChallenges = await Challenge.find({
      $or: [
        { challenger: email, status: 'pending' },
        { recipient: email, status: 'pending' }
      ]
    });
    res.json(pendingChallenges);
  } catch (error) {
    console.error('Error fetching pending challenges:', error);
    res.status(500).json({ error: 'Failed to fetch pending challenges' });
  }
});

// Route to get incoming challenges for a specific user

app.post('/update-challenge-steps', async (req, res) => {
  const { challengeId, userEmail, currentSteps } = req.body;

  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const today = new Date().toDateString();
    const challengeDate = new Date(challenge.date).toDateString();

    // Only process challenge if it is today and not completed
    if (challengeDate !== today || challenge.completed) {
      return res.json({ message: 'Not challenge day or already completed', challenge });
    }

    // Update the correct person's steps
    if (userEmail === challenge.challenger) {
      challenge.challengerSteps = currentSteps;
    } else if (userEmail === challenge.recipient) {
      challenge.recipientSteps = currentSteps;
    }

    const { challengerSteps, recipientSteps, steps: target } = challenge;

    if (challengerSteps >= target || recipientSteps >= target) {
      challenge.completed = true;
      challenge.status = "completed";

      let winner;
      if (challengerSteps >= target && recipientSteps >= target) {
        winner = challengerSteps > recipientSteps ? challenge.challenger : challenge.recipient;
      } else {
        winner = challengerSteps >= target ? challenge.challenger : challenge.recipient;
      }

      challenge.winner = winner;

      const loser = winner === challenge.challenger ? challenge.recipient : challenge.challenger;
      const winnerUser = await User.findOne({ email: winner });
      const loserUser = await User.findOne({ email: loser });

      if (winnerUser && loserUser) {
        winnerUser.totalTokens += challenge.tokens;
        loserUser.totalTokens = Math.max(0, loserUser.totalTokens - challenge.tokens);
        await winnerUser.save();
        await loserUser.save();
      }
    }

    await challenge.save();

    res.json({
      message: 'Challenge updated',
      challenge,
      completed: challenge.completed,
      winner: challenge.winner
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/decline-accepted-challenge', async (req, res) => {
  const { challengeId, userEmail } = req.body;

  try {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Verify the user is either the challenger or recipient
    if (challenge.challenger !== userEmail && challenge.recipient !== userEmail) {
      return res.status(403).json({ error: 'Unauthorized to decline this challenge' });
    }

    // Only allow declining accepted challenges
    if (challenge.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only decline accepted challenges' });
    }

    // Set challenge status to 'declined' and save who declined it
    challenge.status = 'declined';
    challenge.declinedBy = userEmail;
    challenge.declinedAt = new Date();
    
    await challenge.save();

    res.json({ 
      message: 'Challenge declined successfully',
      challenge
    });
  } catch (error) {
    console.error('Error declining accepted challenge:', error);
    res.status(500).json({ error: 'Failed to decline challenge' });
  }
});

// Accept a challenge
// Accept a challenge (Fixed)
app.post('/accept-challenge/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const challenge = await Challenge.findById(id);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Update challenge status to 'accepted'
    challenge.status = 'accepted';
    await challenge.save();

    // Fetch updated pending challenges for the challenger
    const pendingChallenges = await Challenge.find({
      $or: [
        { challenger: challenge.challenger, status: 'pending' },
        { recipient: challenge.challenger, status: 'pending' }
      ]
    });

    res.json({ 
      message: 'Challenge accepted successfully!', 
      challenge,
      pendingChallenges
    });
  } catch (error) {
    console.error('Error accepting challenge:', error);
    res.status(500).json({ error: 'Failed to accept challenge' });
  }
});

app.post('/decline-challenge', async (req, res) => {
  const { challengeId } = req.body;

  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Update challenge status instead of deleting it
    challenge.status = 'declined';

    // Store notification inside the challenge
    challenge.notifications = `${challenge.recipientName} declined your challenge.`;

    await challenge.save();

    res.json({ message: 'Challenge declined successfully!', challenge });
  } catch (error) {
    console.error('Error declining challenge:', error);
    res.status(500).json({ error: 'Failed to decline challenge' });
  }
});

app.delete('/delete-challenge/:challengeId/:userEmail', async (req, res) => {
  const { challengeId, userEmail } = req.params;

  try {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Verify the user is either the challenger or recipient
    if (challenge.challenger !== userEmail && challenge.recipient !== userEmail) {
      return res.status(403).json({ error: 'Unauthorized to delete this challenge' });
    }

    // Add a deletedFor array to track who has deleted the challenge
    if (!challenge.deletedFor) {
      challenge.deletedFor = [];
    }

    // Add this user to the deletedFor array if not already there
    if (!challenge.deletedFor.includes(userEmail)) {
      challenge.deletedFor.push(userEmail);
      await challenge.save();
    }

    res.json({ 
      message: 'Challenge deleted successfully',
      challenge
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

app.delete('/delete-all-completed/:userEmail', async (req, res) => {
  const { userEmail } = req.params;

  try {
    const challenges = await Challenge.find({
      $or: [
        { challenger: userEmail },
        { recipient: userEmail }
      ],
      status: 'completed'
    });

    // Add user to deletedFor array for each completed challenge
    for (const challenge of challenges) {
      if (!challenge.deletedFor) {
        challenge.deletedFor = [];
      }
      if (!challenge.deletedFor.includes(userEmail)) {
        challenge.deletedFor.push(userEmail);
        await challenge.save();
      }
    }

    res.json({ 
      message: 'All completed challenges deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all completed challenges:', error);
    res.status(500).json({ error: 'Failed to delete challenges' });
  }
});

app.get('/user-tokens/:email', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.params.email });
      if (user) {
        res.json({
          todayTokens: user.todayTokens || 0,
          totalTokens: user.totalTokens || 0
        });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });

app.get('/incoming-challenges/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const challenges = await Challenge.find({ recipient: email, status: 'pending' });
    res.status(200).json(challenges);
  } catch (error) {
    console.error('Error fetching incoming challenges:', error);
    res.status(500).json({ error: 'Failed to fetch incoming challenges' });
  }
});
app.get('/upcoming-challenges/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const challenges = await Challenge.find({ recipient: email, status: "accepted" });
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: "Error fetching upcoming challenges" });
  }
});

app.get('/challenger-challenges/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const challenges = await Challenge.find({ 
      challenger: email,
      status: { $in: ['accepted', 'completed', 'ongoing'] }
    });
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: "Error fetching challenger's challenges" });
  }
});


// Add a new route to handle token cashout
app.post('/cashout-tokens', async (req, res) => {
  const { email, tokensToRedeem } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has enough tokens
    if (user.totalTokens < tokensToRedeem) {
      return res.status(400).json({ error: 'Insufficient tokens' });
    }

    // Calculate payment amount (1 token = 0.1 rupees)
    const paymentAmount = (tokensToRedeem * 0.1).toFixed(2);

    // In a real system, you would integrate with a payment gateway here
    // For testing, we'll just simulate a successful payment
    const paymentDetails = {
      amount: paymentAmount,
      currency: 'INR',
      status: 'success',
      timestamp: new Date(),
      transactionId: 'TEST_' + Math.random().toString(36).substr(2, 9)
    };

    // Deduct tokens from user's account
    user.totalTokens -= tokensToRedeem;
    await user.save();

    // Store payment history in user document
    if (!user.paymentHistory) {
      user.paymentHistory = [];
    }
    
    user.paymentHistory.push({
      amount: paymentAmount,
      tokens: tokensToRedeem,
      transactionId: paymentDetails.transactionId,
      timestamp: paymentDetails.timestamp
    });

    await user.save();

    res.json({
      message: 'Cashout successful',
      paymentDetails,
      remainingTokens: user.totalTokens
    });
  } catch (error) {
    console.error('Error processing cashout:', error);
    res.status(500).json({ error: 'Failed to process cashout' });
  }
});

// Add a route to get payment history
app.get('/payment-history/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.paymentHistory || []);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});


app.listen(5000, () => console.log('Server running on port 5000'));
