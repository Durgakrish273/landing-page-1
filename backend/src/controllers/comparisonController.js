import mongoose from "mongoose";
import Comparison from "../models/Comparison.js";
import { ENGINE, analyze } from "../services/analyze.js";
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
    resume: {
      originalName: doc.resume.originalName,
      size: doc.resume.size,
    },
    jobDescription: doc.jobDescription,
    createdAt: doc.createdAt,
  };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
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

  // Filled synchronously for now. When the AI step lands this becomes the
  // queue: create as "pending", return, and let a worker complete it.
  const analysis = analyze({
    resumeName: req.file.originalname,
    resumeSize: req.file.size,
    jobDescription,
  });

  const comparison = await Comparison.create({
    resume: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      text: "", // no PDF parsing yet — see services/analyze.js
    },
    jobDescription,
    engine: ENGINE,
    status: "complete",
    ...analysis,
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
