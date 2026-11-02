import { Schema, model, Document, Types } from 'mongoose';

export enum SenderType {
  USER = 'USER',
  AI = 'AI',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
}

export interface ICitation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  snippet?: string;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  companyId: Types.ObjectId;
  senderId?: Types.ObjectId;
  senderType: SenderType;
  content: string;
  citations: ICitation[];
  feedback?: {
    rating: number; // 1 to 5, or 1 (up) / -1 (down)
    comment?: string;
    submittedAt: Date;
  };
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderType: { type: String, enum: Object.values(SenderType), required: true },
    content: { type: String, required: true },
    citations: [
      {
        documentId: { type: String, required: true },
        documentName: { type: String, required: true },
        pageNumber: { type: Number },
        snippet: { type: String },
      },
    ],
    feedback: {
      rating: { type: Number },
      comment: { type: String },
      submittedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Message = model<IMessage>('Message', MessageSchema);