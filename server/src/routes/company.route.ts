import { Router } from "express";
import {
  createCompany,
  getCompanyById,
  updateCompany,
  addAgent,
  removeAgent,
  getCompanyAgents,
} from "../controllers/company.controller";
import { authenticate } from "../middlewares/auth.middleware.ts";

const router = Router();


router.post("/", authenticate, createCompany);
router.get("/:companyId", getCompanyById);
router.patch("/:companyId", authenticate, updateCompany);


router.get("/:companyId/agents", getCompanyAgents);
router.post("/:companyId/agents", authenticate, addAgent);
router.delete("/:companyId/agents/:agentId", authenticate, removeAgent);

export default router;
