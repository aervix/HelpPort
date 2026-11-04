import { Request, Response } from "express";
import { Types } from "mongoose";
import { UserMessage } from "../models/UserMessage";
import { AIResponse } from "../models/AIResponse";
import { AgentResponse } from "../models/AgentResponse";
import { AuthenticatedRequest } from "../types/types";


type AIRequestpayload = {
  userMessageId: string;
  companyId: string;
  userId: string;
  queryText: string;
};

const dispatchToAiService = async (
  payload: AIRequestpayload,
): Promise<string> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  return "Message In Progress";
};


export const createMessage = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { companyId, queryText } = req.body;

    if (!userId || !companyId || !queryText?.trim()) {
      res.status(400).json({
        success: false,
        message: "companyId and queryText are required",
      });
      return;
    }

    if (!Types.ObjectId.isValid(companyId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid company ID format" });
      return;
    }

    const message = await UserMessage.create({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      queryText: queryText.trim(),
    });

    // dispatch to the AI response pipeline
    const AIResponse = dispatchToAiService({
      userMessageId: message._id.toString(),
      companyId,
      userId,
      queryText: message.queryText,
    });

    res.status(201).json({
      success: true,
      message: "Message queued and sent to AI pipeline",
      AIResponse,
      data: message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create message",
      error: error.message,
    });
  }
};


export const getMessagesByCompany = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { companyId } = req.params as {companyId : string};
    const { page = "1", limit = "15" } = req.query;

    if (!Types.ObjectId.isValid(companyId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid company ID format" });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 15);

    const [messages, total] = await Promise.all([
      UserMessage.find({ companyId: new Types.ObjectId(companyId) })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("userId", "name email"),
      UserMessage.countDocuments({ companyId: new Types.ObjectId(companyId) }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve company messages",
      error: error.message,
    });
  }
};


export const getUserHistory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { companyId } = req.params as { companyId: string };

    if (!userId || !Types.ObjectId.isValid(companyId)) {
      res.status(400).json({
        success: false,
        message: "Valid companyId and authentication required",
      });
      return;
    }

    const messages = await UserMessage.find({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user history",
      error: error.message,
    });
  }
};


export const getMessageById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { messageId } = req.params as {messageId : string};

    if (!Types.ObjectId.isValid(messageId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid message ID format" });
      return;
    }

    const message = await UserMessage.findById(messageId).populate(
      "userId",
      "name email",
    );
    if (!message) {
      res.status(404).json({ success: false, message: "Message not found" });
      return;
    }

    // Fetch linked AI and Agent replies concurrently
    const [aiResponse, agentResponses] = await Promise.all([
      AIResponse.findOne({ userMessageId: message._id }),
      AgentResponse.find({ userMessageId: message._id }).populate(
        "agentId",
        "name email",
      ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        message,
        aiResponse: aiResponse || null,
        agentResponses: agentResponses || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch message details",
      error: error.message,
    });
  }
};
