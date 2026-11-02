import { Schema, model, Document } from 'mongoose';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);