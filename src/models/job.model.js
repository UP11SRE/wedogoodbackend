import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    job_id: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending' },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    error_message: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default mongoose.model('Job', jobSchema);
