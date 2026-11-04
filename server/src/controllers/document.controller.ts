import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { Document, DocumentStatus } from '../models/Document';
import { Company } from '../models/Company';
import { AuthenticatedRequest } from '../types/types';

// Helper: Compute SHA-256 checksum from file buffer
const computeChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Helper: Mock/adapter for object storage upload (e.g. S3/MinIO)
const uploadToObjectStorage = async (file: Express.Multer.File, companyId: string): Promise<string> => {
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `tenants/${companyId}/docs/${timestamp}-${safeName}`;
};

// Helper: Call Python FastAPI service asynchronously
const notifyAiService = async (endpoint: string, payload: object): Promise<void> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  fetch(`${aiServiceUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => console.error(`AI service notification failed (${endpoint}):`, err.message));
};

/**
 * Uploads a document, checks duplicate checksum, stores metadata, and notifies AI service.
 */
export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const userId = req.user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    if (!Types.ObjectId.isValid(companyId) || !userId) {
      res.status(400).json({ success: false, message: 'Invalid company ID or unauthenticated user' });
      return;
    }

    const checksum = computeChecksum(file.buffer);

    // Prevent duplicate uploads within the same company
    const existingDoc = await Document.findOne({ companyId, checksum });
    if (existingDoc) {
      res.status(409).json({ success: false, message: 'Duplicate document already exists in this company' });
      return;
    }

    const storageKey = await uploadToObjectStorage(file, companyId);

    // Create document record in MongoDB
    const document = await Document.create({
      companyId: new Types.ObjectId(companyId),
      uploadedBy: new Types.ObjectId(userId),
      name: file.originalname,
      fileType: file.mimetype,
      storageKey,
      checksum,
      status: DocumentStatus.PENDING,
    });

    // Link document to company
    await Company.findByIdAndUpdate(companyId, { $push: { documents: document._id } });

    // Trigger async background ingestion in AI service
    notifyAiService('/api/ingest', {
      documentId: document._id.toString(),
      companyId,
      storageKey,
      fileType: file.mimetype,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and queued for processing',
      data: document,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Document upload failed', error: error.message });
  }
};

/**
 * Lists all documents for a company with pagination and status filtering.
 */
export const getCompanyDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: 'Invalid company ID' });
      return;
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit as string, 10) || 10);
    const filter: Record<string, any> = { companyId: new Types.ObjectId(companyId) };

    if (status && Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      filter.status = status;
    }

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('uploadedBy', 'name email'),
      Document.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        documents,
        pagination: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve documents', error: error.message });
  }
};

/**
 * Fetches detailed metadata for a single document.
 */
export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: 'Invalid document ID' });
      return;
    }

    const document = await Document.findById(documentId).populate('uploadedBy', 'name email');
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch document', error: error.message });
  }
};

/**
 * Deletes document record, cleans company references, and notifies AI service to purge vectors.
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: 'Invalid document ID' });
      return;
    }

    const document = await Document.findByIdAndDelete(documentId);
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Remove reference from Company
    await Company.findByIdAndUpdate(document.companyId, { $pull: { documents: document._id } });

    // Tell AI service to delete all vector chunks for this document from Chroma
    notifyAiService('/api/documents/purge', {
      companyId: document.companyId.toString(),
      documentId: document._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted and vector purge triggered',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
};

/**
 * Resets document status to PENDING and re-triggers vector indexing.
 */
export const triggerReprocess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: 'Invalid document ID' });
      return;
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      { $set: { status: DocumentStatus.PENDING } },
      { new: true }
    );

    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Trigger re-ingestion
    notifyAiService('/api/ingest', {
      documentId: document._id.toString(),
      companyId: document.companyId.toString(),
      storageKey: document.storageKey,
      fileType: document.fileType,
    });

    res.status(200).json({
      success: true,
      message: 'Document status reset to PENDING and reprocessing queued',
      data: document,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to trigger reprocessing', error: error.message });
  }
};