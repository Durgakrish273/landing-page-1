/* Scores a resume against a job description, using labd.
 *
 * Replaces the earlier placeholder. The difference that matters: that version
 * decided which skills a resume "had" from a hash of its filename, so it never
 * read the document. This one is given the resume's actual text, extracted from
 * the PDF beforehand, so the matched list is evidence rather than a guess.
 *
 * Two functions, on purpose:
 *
 *   buildPrompt()  pure, no network — so the exact text sent to the model can be
 *                  asserted in a test without spending the learner's allowance.
 *   scoreResume()  the call plus parsing.
 *
 * The fallback to keyword matching exists because the API can be off, out of
 * allowance, or briefly down. A learner who uploaded a resume should still get a
 * score in those cases, labelled honestly as not-AI, rather than an error page.
 */
import { askLabd, LabdError } from "./labdClient.js";
import { keywordScore, SKILL_POOL } from "./keywordScore.js";

export const ENGINE_AI = "ai";
export const ENGINE_KEYWORD = "keyword";

/* Roughly 12k characters of resume plus 8k of job description. This is a ceiling
 * on cost, not a technical limit — a JSON reply needs room too, and a one-page
 * resume is about 2-3k characters. */
const MAX_RESUME_CHARS = 12_000;
const MAX_JD_CHARS = 8_000;

/* The reply format. Returning a shape instead of paragraphs is what lets the
 * result be rendered without a second AI call to interpret it. */
const RESPONSE_SHAPE = `{
  "score": <integer 0-100>,
  "verdict": "<3-5 words>",
  "summary": "<2 sentences, addressed to the candidate>",
  "matchedSkills": ["<skill>", ...],
  "missingSkills": ["<skill>", ...]
}`;

/** Truncation is explicit in the prompt, so the model knows it may be reading a
 *  partial document rather than silently scoring half a resume as complete. */
function clamp(text, max) {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}

/**
 * Builds the single user message. Exported so it can be tested directly.
 * @returns {string}
 */
export function buildPrompt({ resumeText, jobDescription }) {
  const resume = clamp(resumeText, MAX_RESUME_CHARS);
  const jd = clamp(jobDescription, MAX_JD_CHARS);

  const notes = [];
  if (resume.truncated) notes.push("The resume was truncated; score what is present.");
  if (jd.truncated) notes.push("The job description was truncated.");

  return `You are screening a resume against a job description and returning a structured match report.

Score how well the resume matches this specific job description. Judge only on evidence in the resume. Do not credit a skill because it is plausible for someone with this background — a skill is "matched" only if the resume shows it, in a skill list, a job entry or a project.

Scoring guide:
- 80-100: covers nearly every requirement, with evidence
- 65-79: covers most requirements, a few clear gaps
- 50-64: covers some, notable gaps
- below 50: covers few requirements

Rules:
- matchedSkills: skills the job description asks for that the resume demonstrates.
- missingSkills: skills the job description asks for that the resume does not demonstrate. If the job description is vague, use the skills a role like it typically requires.
- Do not invent skills in either list. Use the wording from the job description where possible.
- summary: two sentences to the candidate, naming the biggest gap. Do not open with praise.
${notes.length ? `\nNote: ${notes.join(" ")}\n` : ""}
Reply with JSON only — no markdown fences, no text before or after — in exactly this shape:
${RESPONSE_SHAPE}

--- JOB DESCRIPTION ---
${jd.text}

--- RESUME ---
${resume.text}`;
}

/** Reads the model's reply, tolerating a fenced code block around the JSON.
 *
 * Smaller models often wrap JSON in ```json fences no matter what the prompt
 * says, so stripping them is cheaper than another round trip to ask for raw JSON.
 */
export function parseAiResponse(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Fall back to the outermost braces if there is any preamble left.
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const candidate =
    first > -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new LabdError("labd's reply was not valid JSON.");
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  if (!Number.isFinite(score)) {
    throw new LabdError("labd's reply had no usable score.");
  }

  const asStringList = (value) =>
    Array.isArray(value)
      ? value.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
      : [];

  return {
    score,
    verdict: typeof parsed.verdict === "string" ? parsed.verdict.trim() : "",
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    matchedSkills: asStringList(parsed.matchedSkills),
    missingSkills: asStringList(parsed.missingSkills),
  };
}

/**
 * @param {{ resumeText: string, jobDescription: string, apiKey?: string }} input
 * @returns {Promise<{ result: object, engine: string, warning: string, percentLeft: number|null }>}
 */
export async function scoreResume({ resumeText, jobDescription, apiKey }) {
  try {
    const { text, percentLeft } = await askLabd(
      buildPrompt({ resumeText, jobDescription }),
      { apiKey }
    );

    const result = parseAiResponse(text);

    // An empty matched list from a non-empty resume usually means the model
    // could not read the text rather than that the candidate has no skills.
    // Surfacing it costs nothing and saves a confusing result.
    const warning =
      !result.matchedSkills.length && resumeText.trim()
        ? "labd found no matching skills — the resume text may not have extracted cleanly."
        : "";

    return { result, engine: ENGINE_AI, warning, percentLeft };
  } catch (err) {
    if (!(err instanceof LabdError)) throw err;

    // Degrade rather than fail. The keyword scorer reads the real resume text, so
    // this is still a genuine comparison — just not a semantic one.
    const result = keywordScore({ resumeText, jobDescription });
    return {
      result,
      engine: ENGINE_KEYWORD,
      warning: `${err.message} Scored by keyword match instead.`,
      percentLeft: null,
    };
  }
}

export { SKILL_POOL };
