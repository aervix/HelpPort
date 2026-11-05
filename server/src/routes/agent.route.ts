import { Router } from "express";
import {
  createAgentReply,
  getAgentRepliesByMessage,
  updateAgentReply,
} from "../controllers/agentResponse.controller";
import { authenticate } from "../middlewares/auth.middleware.ts";

const router = Router();


router.post("/", authenticate, createAgentReply);


router.get("/message/:userMessageId", authenticate, getAgentRepliesByMessage);

router.patch("/:responseId", authenticate, updateAgentReply);

export default router;
