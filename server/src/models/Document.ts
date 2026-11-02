import { Schema, model, Document as MDocument, Types } from 'mongoose';

export enum DocumentVisibility {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  RESTRICTED = 'RESTRICTED',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

interface IDocVersion {
  versionNumber: number;
  storageKey: string;
  checksum: string;
  createdAt: Date;
}

export interface IDocument extends MDocument {
  companyId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  name: string;
  fileType: string;
  storageKey: string;
  checksum: string;
  visibility: DocumentVisibility;
  allowedRoles: string[];
  status: DocumentStatus;
  currentVersion: number;
  versions: IDocVersion[];
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
    visibility: { type: String, enum: Object.values(DocumentVisibility), default: DocumentVisibility.INTERNAL },
    allowedRoles: [{ type: String }],
    status: { type: String, enum: Object.values(DocumentStatus), default: DocumentStatus.PENDING },
    currentVersion: { type: Number, default: 1 },
    versions: [
      {
        versionNumber: { type: Number, required: true },
        storageKey: { type: String, required: true },
        checksum: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

DocumentSchema.index({ companyId: 1, checksum: 1 });
DocumentSchema.index({ companyId: 1, status: 1 });

export const Document = model<IDocument>('Document', DocumentSchema);