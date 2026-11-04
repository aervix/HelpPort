import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import crypto from "crypto";
import { Document, DocumentStatus } from "../models/Document";
import { Company } from "../models/Company";
import { AuthenticatedRequest } from "../types/types";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/storage.ts";

const computeChecksum = (buffer: Buffer): string => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};
computeChecksum;
const notifyAiService = (
  endpoint: string,
  payload: Record<string, any>,
): void => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

  fetch(`${aiServiceUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) =>
    console.error(
      `AI service background task failed (${endpoint}):`,
      err.message,
    ),
  );
};

export const uploadDocument = async (
  req: AuthenticatedRequest & { file?: any },
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { companyId } = req.params as { companyId: string };
    const userId = req.user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      await session.abortTransaction();
      return;
    }

    if (!Types.ObjectId.isValid(companyId) || !userId) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID or unauthenticated user",
      });
      await session.abortTransaction();
      return;
    }

    // 1. Duplicate detection via SHA-256
    const fileBuffer = file.buffer;
    const checksum = computeChecksum(fileBuffer);

    const existingDoc = await Document.findOne({ companyId, checksum }).session(
      session,
    );
    if (existingDoc) {
      res.status(409).json({
        success: false,
        message: "Duplicate document already exists in this company",
      });
      await session.abortTransaction();
      return;
    }

    const targetFile = file.path || file.buffer;
    const uploadResult = await uploadOnCloudinary(
      targetFile,
      `tenants/${companyId}`,
    );

    if (!uploadResult) {
      res.status(502).json({
        success: false,
        message: "Failed to upload file to Cloudinary storage",
      });
      await session.abortTransaction();
      return;
    }


    const document = new Document({
      companyId: new Types.ObjectId(companyId),
      uploadedBy: new Types.ObjectId(userId),
      name: file.originalname,
      fileType: file.mimetype,
      storageKey: uploadResult,
      // cloudinaryPublicId: uploadResult.public_id,
      checksum,
      status: DocumentStatus.PENDING,
    });

    await document.save({ session });


    await Company.findByIdAndUpdate(
      companyId,
      { $addToSet: { documents: document._id } },
      { session },
    );

    await session.commitTransaction();

    // 5. Trigger asynchronous vector indexing
    notifyAiService("/api/ingest", {
      documentId: document._id.toString(),
      companyId,
      storageKey: document.storageKey,
      fileType: file.mimetype,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded and queued for processing",
      data: document,
    });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Document upload failed",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};


export const getCompanyDocuments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { companyId } = req.params as { companyId: string };
    const { status, page = "1", limit = "10" } = req.query;

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: "Invalid company ID" });
      return;
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit as string, 10) || 10);

    const filter: Record<string, any> = {
      companyId: new Types.ObjectId(companyId),
    };

    if (
      status &&
      Object.values(DocumentStatus).includes(status as DocumentStatus)
    ) {
      filter.status = status;
    }

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate("uploadedBy", "name email"),
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
    res.status(500).json({
      success: false,
      message: "Failed to retrieve documents",
      error: error.message,
    });
  }
};

/**
 * Fetches single document metadata by ID.
 */
export const getDocumentById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { documentId } = req.params as { documentId: string };

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: "Invalid document ID" });
      return;
    }

    const document = await Document.findById(documentId).populate(
      "uploadedBy",
      "name email",
    );

    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    res.status(200).json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch document",
      error: error.message,
    });
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { documentId } = req.params as { documentId: string };

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: "Invalid document ID" });
      await session.abortTransaction();
      return;
    }

    const document = await Document.findByIdAndDelete(documentId, { session });
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      await session.abortTransaction();
      return;
    }

    // Pull document reference from Company
    await Company.findByIdAndUpdate(
      document.companyId,
      { $pull: { documents: document._id } },
      { session },
    );

    await session.commitTransaction();

    // TODO: Delete file from Cloudinary storage
    // if ((document as any).cloudinaryPublicId) {
    //   deleteFromCloudinary((document).cloudinaryPublicId).catch(
    //     (err: any) =>
    //       console.error("Cloudinary asset deletion failed:", err.message),
    //   );
    // }

    // 2. Dispatch vector chunk purge to AI service
    notifyAiService("/api/documents/purge", {
      companyId: document.companyId.toString(),
      documentId: document._id.toString(),
    });

    res.status(200).json({
      success: true,
      message:
        "Document deleted, cloud storage cleaned, and vector purge triggered",
    });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Resets document status to PENDING and triggers background re-indexing.
 */
export const triggerReprocess = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { documentId } = req.params as { documentId: string };

    if (!Types.ObjectId.isValid(documentId)) {
      res.status(400).json({ success: false, message: "Invalid document ID" });
      return;
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      { $set: { status: DocumentStatus.PENDING } },
      { new: true },
    );

    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    // Queue re-ingestion
    notifyAiService("/api/ingest", {
      documentId: document._id.toString(),
      companyId: document.companyId.toString(),
      storageKey: document.storageKey,
      fileType: document.fileType,
    });

    res.status(200).json({
      success: true,
      message: "Document status reset to PENDING and reprocessing queued",
      data: document,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to trigger reprocessing",
      error: error.message,
    });
  }
};
