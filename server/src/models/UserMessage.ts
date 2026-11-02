import { Schema, model, Document, Types } from 'mongoose';

export interface IUserMessage extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  queryText: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserMessageSchema = new Schema<IUserMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    queryText: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

UserMessageSchema.index({ companyId: 1, createdAt: -1 });

export const UserMessage = model<IUserMessage>('UserMessage', UserMessageSchema);