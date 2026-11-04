import { Schema, model, Document, Types } from 'mongoose';

export interface IAgentResponse extends Document {
  userId: Types.ObjectId;       
  agentId: Types.ObjectId;      
  companyId: Types.ObjectId;
  userMessageId: Types.ObjectId;
  responseText: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentResponseSchema = new Schema<IAgentResponse>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userMessageId: { type: Schema.Types.ObjectId, ref: 'UserMessage', required: true, index: true },
    responseText: { type: String, required: true },
  },
  { timestamps: true }
);

AgentResponseSchema.index({ companyId: 1, userMessageId: 1 });

export const AgentResponse = model<IAgentResponse>('AgentResponse', AgentResponseSchema);