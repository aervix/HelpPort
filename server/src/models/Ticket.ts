import { Schema, model, Document, Types } from 'mongoose';

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

interface ITicketMessage {
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

interface IStatusLog {
  oldStatus: TicketStatus;
  newStatus: TicketStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
}

export interface ITicket extends Document {
  companyId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  customerId: Types.ObjectId;
  assignedAgentId?: Types.ObjectId;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  messages: ITicketMessage[];
  statusHistory: IStatusLog[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    category: { type: String, required: true },
    priority: { type: String, enum: Object.values(TicketPriority), default: TicketPriority.MEDIUM },
    status: { type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    messages: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    statusHistory: [
      {
        oldStatus: { type: String, enum: Object.values(TicketStatus), required: true },
        newStatus: { type: String, enum: Object.values(TicketStatus), required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

TicketSchema.index({ companyId: 1, status: 1 });
TicketSchema.index({ companyId: 1, assignedAgentId: 1 });

export const Ticket = model<ITicket>('Ticket', TicketSchema);