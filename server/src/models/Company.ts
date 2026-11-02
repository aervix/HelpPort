import { Schema, model, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Company = model<ICompany>('Company', CompanySchema);