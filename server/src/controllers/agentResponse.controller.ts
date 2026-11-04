import { Request, Response } from "express";
import { Types } from "mongoose";
import { AgentResponse } from "../models/AgentResponse";
import { UserMessage } from "../models/UserMessage";
import { Company } from "../models/Company";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Allows a verified agent of that company to respond to a customer query.
 */
export const createAgentReply = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const agentId = req.user?.id;
    const { userMessageId, responseText } = req.body;

    if (!agentId || !userMessageId || !responseText?.trim()) {
      res
        .status(400)
        .json({
          success: false,
          message: "userMessageId and responseText are required",
        });
      return;
    }

    if (!Types.ObjectId.isValid(userMessageId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid userMessageId format" });
      return;
    }

    const userMessage = await UserMessage.findById(userMessageId);
    if (!userMessage) {
      res
        .status(404)
        .json({ success: false, message: "Original user message not found" });
      return;
    }

    // Verify the user is an active agent of the target company
    const company = await Company.findById(userMessage.companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const isAuthorizedAgent = company.agents.some(
      (id) => id.toString() === agentId,
    );
    if (!isAuthorizedAgent) {
      res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You are not an agent for this company",
        });
      return;
    }

    const agentReply = await AgentResponse.create({
      userId: userMessage.userId,
      agentId: new Types.ObjectId(agentId),
      companyId: userMessage.companyId,
      userMessageId: userMessage._id,
      responseText: responseText.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Agent response created successfully",
      data: agentReply,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to create agent reply",
        error: error.message,
      });
  }
};

/**
 * Retrieves all human agent replies linked to a specific user message.
 */
export const getAgentRepliesByMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userMessageId } = req.params;

    if (!Types.ObjectId.isValid(userMessageId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid userMessageId format" });
      return;
    }

    const replies = await AgentResponse.find({
      userMessageId: new Types.ObjectId(userMessageId),
    })
      .sort({ createdAt: 1 })
      .populate("agentId", "name email");

    res.status(200).json({
      success: true,
      data: replies,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to retrieve agent replies",
        error: error.message,
      });
  }
};

/**
 * Allows the authoring agent to edit their response.
 */
export const updateAgentReply = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const agentId = req.user?.id;
    const { responseId } = req.params;
    const { responseText } = req.body;

    if (
      !agentId ||
      !Types.ObjectId.isValid(responseId) ||
      !responseText?.trim()
    ) {
      res
        .status(400)
        .json({
          success: false,
          message:
            "Valid responseId, agent authorization, and responseText are required",
        });
      return;
    }

    const reply = await AgentResponse.findById(responseId);
    if (!reply) {
      res
        .status(404)
        .json({ success: false, message: "Agent reply not found" });
      return;
    }

    // Only the agent who created the reply can update it
    if (reply.agentId.toString() !== agentId) {
      res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You can only edit your own responses",
        });
      return;
    }

    reply.responseText = responseText.trim();
    await reply.save();

    res.status(200).json({
      success: true,
      message: "Agent response updated successfully",
      data: reply,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update agent reply",
        error: error.message,
      });
  }
};
