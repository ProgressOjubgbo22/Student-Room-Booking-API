import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true },
    building: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 4, min: 1, max: 4 },
    
    occupiedCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.roomId = ret._id;
        ret.occupied = ret.occupiedCount;
        ret.availableSpaces = Math.max(ret.capacity - ret.occupiedCount, 0);
        ret.isAvailable = ret.availableSpaces > 0;
        delete ret._id;
        delete ret.__v;
        delete ret.occupiedCount;
        return ret;
      },
    },
  }
);

export default mongoose.model('Room', roomSchema);
