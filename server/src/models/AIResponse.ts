import { Schema, model, Document, Types } from 'mongoose';

export interface ICitation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  snippet?: string;
}

export interface IAIResponse extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  userMessageId: Types.ObjectId;
  responseText: string;
  citations?: ICitation[];
  confidenceScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIResponseSchema = new Schema<IAIResponse>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userMessageId: { type: Schema.Types.ObjectId, ref: 'UserMessage', required: true, index: true },
    responseText: { type: String, required: true },
    citations: [
      {
        documentId: { type: String, required: true },
        documentName: { type: String, required: true },
        pageNumber: { type: Number },
        snippet: { type: String },
      },
    ],
    confidenceScore: { type: Number, min: 0, max: 1 },
  },
  { timestamps: true }
);

AIResponseSchema.index({ companyId: 1, userMessageId: 1 });

export const AIResponse = model<IAIResponse>('AIResponse', AIResponseSchema);