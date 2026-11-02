import { Schema, model, Document, Types } from 'mongoose';

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER',
}

export interface IMembership extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  role: MemberRole;
  permissions: string[]; // e.g., ['documents:write', 'tickets:resolve']
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    role: { type: String, enum: Object.values(MemberRole), default: MemberRole.CUSTOMER },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

MembershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });

export const Membership = model<IMembership>('Membership', MembershipSchema);