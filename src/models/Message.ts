import mongoose, { Document } from 'mongoose';

interface IMessage extends Document {
  room: string;
  content: string;
  sender: string;
  timestamp: Date;
}

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  content: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);