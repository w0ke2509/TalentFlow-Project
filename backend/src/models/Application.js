import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'accepted', 'hired', 'rejected'],
      default: 'applied'
    },
    source: {
      type: String,
      default: 'Website'
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    note: {
      type: String,
      trim: true
    },
    offerSalary: { type: Number, min: 1 },
    offerStartDate: Date,
    offerNote: { type: String, trim: true },
    offerAccepted: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

// Indexes phục vụ lọc hồ sơ theo vị trí và trạng thái
applicationSchema.index({ positionId: 1, status: 1 });
applicationSchema.index({ candidateId: 1 });

export default mongoose.model('Application', applicationSchema);
