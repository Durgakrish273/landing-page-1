import mongoose from "mongoose";

/* One document per resume-vs-JD comparison.
 *
 * The AI step is not built yet, so a record is created in "pending" and the
 * score fields are null. When the model is wired up, the worker fills in score,
 * matchedSkills and missingSkills and moves status to "complete" — the shape
 * below is already what the frontend renders, so nothing else has to change.
 */
const comparisonSchema = new mongoose.Schema(
  {
    // --- inputs ---
    resume: {
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      // Extracted text will live here once pdf parsing lands. We store it rather
      // than the PDF itself: keeping uploads out of the database keeps documents
      // small and avoids putting user files in backups.
      text: { type: String, default: "" },
    },
    jobDescription: { type: String, required: true, trim: true },

    // Which scorer produced the numbers: "placeholder" today, "ai" once the
    // model is wired up. Stored so old records stay honest about their origin.
    engine: { type: String, default: "placeholder" },

    // --- output (filled by the AI step, later) ---
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
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

// The history endpoint is "newest first", so index the sort key.
comparisonSchema.index({ createdAt: -1 });

export default mongoose.model("Comparison", comparisonSchema);
