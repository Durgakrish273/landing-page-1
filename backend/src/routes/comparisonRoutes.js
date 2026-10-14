import { Router } from "express";
import {
  createComparison,
  getComparison,
  listComparisons,
} from "../controllers/comparisonController.js";
import { uploadResume } from "../middleware/upload.js";

const router = Router();

/* uploadResume runs before the controller and is what populates req.file.
 *
 * It is `upload.single("resume")`, so the field name on the frontend's
 * FormData must be exactly "resume" — a mismatch shows up as req.file being
 * undefined, not as a helpful multer error. */
router.post("/", uploadResume, createComparison);
router.get("/", listComparisons);
router.get("/:id", getComparison);

export default router;
