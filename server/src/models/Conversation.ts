import { Schema, model, Document, Types } from 'mongoose';

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

export interface IConversation extends Document {
  companyId: Types.ObjectId;
  customerId: Types.ObjectId;
  assignedAgentId?: Types.ObjectId;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: Object.values(ConversationStatus), default: ConversationStatus.ACTIVE },
  },
  { timestamps: true }
);

ConversationSchema.index({ companyId: 1, status: 1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);