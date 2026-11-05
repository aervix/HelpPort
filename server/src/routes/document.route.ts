import { Router } from "express";
import multer from "multer";
import {
  uploadDocument,
  getCompanyDocuments,
  getDocumentById,
  deleteDocument,
  triggerReprocess,
} from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware.ts";


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

const router = Router();

router.post(
  "/company/:companyId",
  authenticate,
  upload.single("file"),
  uploadDocument,
);


router.get("/company/:companyId", authenticate, getCompanyDocuments);


router.get("/:documentId", authenticate, getDocumentById);
router.delete("/:documentId", authenticate, deleteDocument);
router.post("/:documentId/reprocess", authenticate, triggerReprocess);

export default router;
