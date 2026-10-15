import mongoose from 'mongoose';
import { hashPassword, isBcryptHash } from '../utils/password.js';

const employeeSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      default: '123456',
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'interviewer', 'employee'],
      default: 'employee'
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['probation', 'active', 'resigned'],
      default: 'probation'
    },
    officialSalary: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

employeeSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('password')) {
    try {
      if (this.password && !isBcryptHash(this.password)) {
        this.password = await hashPassword(this.password);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

employeeSchema.index({ role: 1, status: 1 });

export default mongoose.model('Employee', employeeSchema);
