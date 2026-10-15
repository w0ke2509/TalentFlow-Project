import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true
    },
    interviewer: {
      type: String,
      required: true,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    round: {
      type: String,
      default: 'Phỏng vấn kỹ thuật'
    },
    type: {
      type: String,
      enum: ['technical', 'hr', 'culture', 'final'],
      default: 'technical'
    },
    location: {
      type: String,
      default: 'Google Meet / Online'
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    result: {
      type: String,
      enum: ['pending', 'pass', 'fail'],
      default: 'pending'
    },
    feedback: {
      type: String,
      trim: true
    },
    comment: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

interviewSchema.index({ scheduledAt: 1, result: 1 });

export default mongoose.model('Interview', interviewSchema);
