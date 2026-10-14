import mongoose from "mongoose";

/* One document per resume-vs-JD comparison.
 *
 * A record is created "complete" because scoring happens within the request
 * today. The other status values are already here for when it moves to a queue:
 * create as "pending", return immediately, and let a worker fill in the result
 * fields and set "complete" or "failed". Nothing about the response shape would
 * have to change for that.
 */
const comparisonSchema = new mongoose.Schema(
  {
    /* Fingerprint of (resume bytes + job description + engine), so an identical
     * request can return the stored result instead of paying for another AI call.
     * `unique` enforces it at the database: two concurrent uploads of the same
     * file race to insert, and the loser gets a duplicate-key error rather than
     * creating a second record. */
    hash: { type: String, required: true, unique: true, index: true },

    // --- inputs ---
    resume: {
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      /* The extracted text. Stored rather than the PDF itself: keeping uploads
       * out of the database keeps documents small. It is also what makes the
       * story checkable later — you can see exactly what the model was given. */
      text: { type: String, default: "" },
    },
    jobDescription: { type: String, required: true, trim: true },

    // Which scorer produced the numbers: "ai" (labd) or "keyword" (the fallback).
    // Stored so an old record stays honest about its origin after the key is added.
    engine: { type: String, enum: ["ai", "keyword"], default: "keyword" },

    // --- output ---
    status: {
      type: String,
      enum: ["pending", "processing", "complete", "failed"],
      default: "pending",
      index: true,
    },
    score: { type: Number, min: 0, max: 100, default: null },
    verdict: { type: String, default: "" },
    summary: { type: String, default: "" },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    /* Non-fatal notes shown under the result — a keyword fallback, or a resume
     * whose text did not extract. Kept separate from `error`, which is for a
     * run that produced nothing usable. */
    warning: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

// The history endpoint is "newest first", so index the sort key.
comparisonSchema.index({ createdAt: -1 });

export default mongoose.model("Comparison", comparisonSchema);
