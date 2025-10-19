import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    ngo_id: { type: String, required: true },
    month: { type: String, required: true },
    people_helped: { type: Number, required: true, default: 0 },
    events_conducted: { type: Number, required: true, default: 0 },
    funds_utilized: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

reportSchema.index({ ngo_id: 1, month: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
