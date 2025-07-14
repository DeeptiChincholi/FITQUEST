import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true, // Ensures unique email
  },
  steps: {
    type: Number,
    required: true,
    default: 0, // Default to 0 if no steps are provided
  },
  calories: {
    type: Number,
    required: true,
    default: 0, // Default to 0 if no calories are provided
  },
  latitude: Number,
  longitude: Number,
  profilePicture: String,
  todayTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  paymentHistory: [{
    amount: Number,
    tokens: Number,
    transactionId: String,
    timestamp: Date
  }]
});

const User = mongoose.model('User', userSchema);

export default User;