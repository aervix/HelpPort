import { Schema, model, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  description?: string;
  profileUrl?: string;
  documents: Types.ObjectId[];
  agents: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    profileUrl: { type: String, trim: true },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    agents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Company = model<ICompany>('Company', CompanySchema);