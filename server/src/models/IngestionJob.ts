import { Schema, model, Document, Types } from 'mongoose';
import { DocumentStatus } from './Document';

export interface IIngestionJob extends Document {
  companyId: Types.ObjectId;
  documentId: Types.ObjectId;
  versionNumber: number;
  status: DocumentStatus;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IngestionJobSchema = new Schema<IIngestionJob>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    versionNumber: { type: Number, required: true },
    status: { type: String, enum: Object.values(DocumentStatus), default: DocumentStatus.PENDING },
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

IngestionJobSchema.index({ companyId: 1, status: 1 });

export const IngestionJob = model<IIngestionJob>('IngestionJob', IngestionJobSchema);