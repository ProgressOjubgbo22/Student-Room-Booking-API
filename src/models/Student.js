import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    matricNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.studentId = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export default mongoose.model('Student', studentSchema);
