import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề vị trí tuyển dụng là bắt buộc'],
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    description: {
      type: String,
      required: true
    },
    requirements: [
      {
        type: String,
        trim: true
      }
    ],
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'paused'],
      default: 'open'
    },
    closedByQuota: {
      type: Boolean,
      default: false
    },
    location: {
      type: String,
      default: 'Hồ Chí Minh'
    },
    level: {
      type: String,
      enum: ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior', 'Lead'],
      default: 'Middle'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Position', positionSchema);
