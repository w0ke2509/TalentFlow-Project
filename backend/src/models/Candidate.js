import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ tên ứng viên là bắt buộc'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male'
    },
    dateOfBirth: {
      type: Date
    },
    skills: [
      {
        type: String,
        trim: true
      }
    ],
    experienceYears: {
      type: Number,
      default: 0,
      min: 0
    },
    education: {
      type: String,
      default: 'Đại học'
    },
    currentStatus: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'accepted', 'hired', 'rejected', 'Hired'],
      default: 'applied'
    },
    address: {
      type: String,
      trim: true
    },
    cvUrl: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    experience: [
      {
        company: { type: String, trim: true },
        position: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String, trim: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Tạo Index phục vụ tìm kiếm nhanh và demo trên Mingo
candidateSchema.index({ fullName: 'text', email: 'text' });
candidateSchema.index({ experienceYears: 1 });
candidateSchema.index({ skills: 1 });
candidateSchema.index({ currentStatus: 1 });

export default mongoose.model('Candidate', candidateSchema);
