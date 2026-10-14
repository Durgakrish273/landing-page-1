import crypto from "node:crypto";
import mongoose from "mongoose";
import Comparison from "../models/Comparison.js";
import { scoreResume } from "../services/analyze.js";
import { extractPdfText } from "../services/pdfText.js";
import { asyncHandler } from "../utils.js";

const MIN_JD_LENGTH = 20;

/* The API returns a fixed shape, not the raw Mongoose document: the client
 * should not have to know about _id/__v, and building the object explicitly
 * means fields like `resume.text` never leak into a response by accident. */
function toClient(doc) {
  return {
    id: doc._id.toString(),
    status: doc.status,
    engine: doc.engine,
    score: doc.score,
    verdict: doc.verdict,
    summary: doc.summary,
    matchedSkills: doc.matchedSkills,
    missingSkills: doc.missingSkills,
    warning: doc.warning,
    resume: {
      originalName: doc.resume.originalName,
      size: doc.resume.size,
      textLength: (doc.resume.text ?? "").length,
    },
    jobDescription: doc.jobDescription,
    createdAt: doc.createdAt,
  };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const badRequest = (message) => httpError(400, message);

/* A fingerprint of exactly what determines the score.
 *
 * Same resume bytes + same job description + same engine = the same answer, so
 * the earlier record can be returned instead of paying labd again. This matters
 * because every model call spends the learner's monthly allowance — re-uploading
 * the same file while debugging the UI should not cost anything.
 *
 * The engine is in the hash deliberately: a result produced by the keyword
 * fallback must not be served once labd is available again. */
function fingerprint({ fileBuffer, jobDescription, engine }) {
  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .update("\u0000")
    .update(jobDescription)
    .update("\u0000")
    .update(engine)
    .digest("hex");
}

/** POST /api/comparisons — multipart: `resume` (PDF) + `jobDescription`. */
export const createComparison = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest("Attach a resume PDF as the `resume` field.");
  }

  const jobDescription = (req.body.jobDescription ?? "").trim();
  if (jobDescription.length < MIN_JD_LENGTH) {
    throw badRequest(
      `Paste the job description (at least ${MIN_JD_LENGTH} characters).`
    );
  }

  // Which engine this request will try for. Kept in the hash so a keyword-row
  // cache entry is never mistaken for an AI one.
  const engineRequested = process.env.LABD_API_KEY ? "ai" : "keyword";
  const hash = fingerprint({
    fileBuffer: req.file.buffer,
    jobDescription,
    engine: engineRequested,
  });

  const cached = await Comparison.findOne({ hash }).lean();
  if (cached) {
    // `cached: true` is not a field the client renders; it is here so the shape
    // stays identical and a caller could tell the difference if it wanted to.
    return res.status(200).json({ comparison: toClient(cached), cached: true });
  }

  // The PDF's text layer. A scanned resume has none, and no amount of parsing
  // will produce it — that is an OCR problem.
  const resumeText = extractPdfText(req.file.buffer);

  const { result, engine, warning } = await scoreResume({
    resumeText,
    jobDescription,
    apiKey: process.env.LABD_API_KEY,
  });

  const comparison = await Comparison.create({
    hash,
    resume: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      text: resumeText,
    },
    jobDescription,
    engine,
    status: "complete",
    warning,
    ...result,
  });

  res.status(201).json({ comparison: toClient(comparison) });
});

/** GET /api/comparisons — newest first, for a history view. */
export const listComparisons = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  // .lean() skips hydrating full Mongoose documents — we only read here, and
  // it is markedly cheaper for a list.
  const docs = await Comparison.find().sort({ createdAt: -1 }).limit(limit).lean();

  res.json({
    count: docs.length,
    comparisons: docs.map(toClient),
  });
});

/** GET /api/comparisons/:id */
export const getComparison = asyncHandler(async (req, res) => {
  // A malformed id would otherwise throw a CastError deep in the driver.
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw badRequest("That is not a valid comparison id.");
  }

  const doc = await Comparison.findById(req.params.id);
  if (!doc) {
    throw httpError(404, "Comparison not found.");
  }

  res.json({ comparison: toClient(doc) });
});
