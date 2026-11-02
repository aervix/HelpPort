import { Schema, model, Document as MDocument, Types } from 'mongoose';

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

export interface IDocument extends MDocument {
  companyId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  name: string;
  fileType: string;
  storageKey: string;
  checksum: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    fileType: { type: String, required: true },
    storageKey: { type: String, required: true },
    checksum: { type: String, required: true },
    status: { type: String, enum: Object.values(DocumentStatus), default: DocumentStatus.PENDING },
  },
  { timestamps: true }
);

DocumentSchema.index({ companyId: 1, checksum: 1 });
DocumentSchema.index({ companyId: 1, status: 1 });

export const Document = model<IDocument>('Document', DocumentSchema);