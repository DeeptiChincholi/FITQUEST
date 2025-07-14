// Challenge.js
import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  challengerName: { type: String, required: true },
  recipientName: { type: String, required: true },
  challenger: { type: String, required: true }, // challenger's email
  recipient: { type: String, required: true },  // recipient's email
  challengeType: { type: String, required: true }, // e.g., 'steps'
  date: { type: Date, default: Date.now },
  steps : {type : Number , required : true} ,
  tokens : {type : Number , required : true},
  notifications : {type : String},
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'completed' , 'ongoing'],
    default: 'pending',
  }, // pending, accepted, declined
  completed: { type: Boolean, default: false },
  winner: { type: String, default: null },
  challengerSteps: { type: Number, default: 0 },
  recipientSteps: { type: Number, default: 0 },
  startTime: { type: Date },
  endTime: { type: Date },
  deletedFor: [String]
});

const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;
