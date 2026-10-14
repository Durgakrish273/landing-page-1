/* Tests the analysis pipeline without spending the labd allowance.
 *
 * Run from backend/:  node scripts/test-pipeline.mjs
 *
 * Nothing here touches the network or MongoDB, so it is safe to run on every
 * change. The one thing it deliberately does NOT cover is a live labd call —
 * that costs allowance, so it is exercised by uploading a real resume instead.
 */
import zlib from "node:zlib";
import { extractPdfText } from "../src/services/pdfText.js";
import { keywordScore } from "../src/services/keywordScore.js";
import { buildPrompt, parseAiResponse } from "../src/services/analyze.js";

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

/* ---------------------------------------------------------------------------
 * A minimal but real PDF: one page whose content stream is FlateDecode
 * compressed, exactly like a PDF produced by a word processor. Building it here
 * means the extractor is tested against actual PDF structure rather than a
 * hand-waved string.
 * ------------------------------------------------------------------------- */
function makePdf(textLines) {
  // Td positions the cursor, Tj draws a string — the operators the extractor
  // looks for.
  const content = textLines
    .map((line, i) => `${i === 0 ? "" : "0 -14 Td "}(${line}) Tj`)
    .join("\n");
  const compressed = zlib.deflateSync(Buffer.from(content, "latin1"));

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>",
    `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n${compressed.toString("latin1")}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  objects.forEach((obj, i) => {
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  return Buffer.from(`${pdf}%%EOF`, "latin1");
}

// --- PDF text extraction ---
const pdf = makePdf([
  "Jane Doe - Frontend Engineer",
  "Skills: JavaScript, React, CSS, MongoDB",
  "Built a dashboard with Node.js and Express",
]);

const extracted = extractPdfText(pdf);
check("extracts text from a compressed PDF", extracted.includes("Jane Doe"), extracted.slice(0, 80));
check("keeps skills readable", extracted.includes("JavaScript"), extracted);
check("separates lines rather than gluing them", extracted.includes("\n"), JSON.stringify(extracted));
check("does not leak PDF syntax", !extracted.includes("endstream") && !extracted.includes("obj"), extracted);

// A scanned resume: no text layer at all. The extractor must return empty rather
// than throwing, because the caller treats empty as "could not read".
const emptyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF", "latin1");
let threw = false;
let emptyResult = "";
try {
  emptyResult = extractPdfText(emptyPdf);
} catch {
  threw = true;
}
check("a PDF with no text layer returns empty, does not throw", !threw && emptyResult === "", JSON.stringify(emptyResult));

// Garbage input must not crash the request.
threw = false;
try {
  extractPdfText(Buffer.from("this is not a pdf at all", "latin1"));
} catch {
  threw = true;
}
check("non-PDF input does not throw", !threw);

// --- keyword scoring ---
const jd =
  "We need a frontend engineer with strong React, TypeScript and CSS. " +
  "You will work with Node.js and our MongoDB data layer. Docker experience is a plus.";

const score = keywordScore({ resumeText: extracted, jobDescription: jd });
check("matches skills present in the resume", score.matchedSkills.includes("React"), JSON.stringify(score.matchedSkills));
check("flags skills absent from the resume", score.missingSkills.includes("TypeScript"), JSON.stringify(score.missingSkills));
check("score is within bounds", score.score >= 0 && score.score <= 100, String(score.score));
check("verdict is set", typeof score.verdict === "string" && score.verdict.length > 0, score.verdict);

/* The score must RESPOND to the resume text. This is the regression that
 * matters: the old placeholder derived its score from the filename, so two
 * different resumes scored identically. */
const weakResume = "Jane Doe. I like computers and I am keen to learn.";
const weakScore = keywordScore({ resumeText: weakResume, jobDescription: jd });
check(
  "a weaker resume scores lower than a stronger one",
  weakScore.score < score.score,
  `${weakScore.score} < ${score.score}`
);
check(
  "the same input scores the same twice",
  keywordScore({ resumeText: extracted, jobDescription: jd }).score === score.score
);

// Word-boundary matching: "digital" must not count as "Git".
const trap = keywordScore({
  resumeText: "I work in digital marketing and I am reactionary about design.",
  jobDescription: "Requirements: Git and React.",
});
check("does not match Git inside 'digital'", !trap.matchedSkills.includes("Git"), JSON.stringify(trap.matchedSkills));
check("does not match React inside 'reactionary'", !trap.matchedSkills.includes("React"), JSON.stringify(trap.matchedSkills));

// --- prompt building ---
const prompt = buildPrompt({ resumeText: extracted, jobDescription: jd });
check("prompt includes the resume text", prompt.includes("Jane Doe"));
check("prompt includes the job description", prompt.includes("frontend engineer"));
check("prompt names the required JSON keys", ["score", "verdict", "summary", "matchedSkills", "missingSkills"].every((k) => prompt.includes(k)));

// Truncation must be announced, not silent.
const longPrompt = buildPrompt({ resumeText: "x".repeat(20_000), jobDescription: jd });
check("marks a truncated resume in the prompt", /truncated/i.test(longPrompt));

// --- reply parsing ---
const good = parseAiResponse(
  JSON.stringify({ score: 72, verdict: "Solid", summary: "Two gaps.", matchedSkills: ["React"], missingSkills: ["Docker"] })
);
check("parses a plain JSON reply", good.score === 72 && good.matchedSkills[0] === "React");

// Models often wrap JSON in fences despite instructions.
const fenced = parseAiResponse('```json\n{"score": 50, "matchedSkills": [], "missingSkills": ["Go"]}\n```');
check("parses a fenced JSON reply", fenced.score === 50, JSON.stringify(fenced));

const framed = parseAiResponse('Here is the report:\n{"score": 91, "matchedSkills": ["A"]}\nHope that helps!');
check("parses JSON surrounded by prose", framed.score === 91);

const clamped = parseAiResponse('{"score": 150}');
check("clamps an out-of-range score", clamped.score === 100, String(clamped.score));

for (const bad of ['{"score": "not a number"}', "not json at all", ""]) {
  let failed = false;
  try {
    parseAiResponse(bad);
  } catch {
    failed = true;
  }
  check(`rejects unparseable reply: ${JSON.stringify(bad).slice(0, 30)}`, failed);
}

// --- report ---
let failures = 0;
for (const { name, pass, detail } of checks) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${!pass && detail ? `\n        got: ${detail}` : ""}`);
}
console.log(`\n${checks.length - failures}/${checks.length} passed`);

process.exit(failures ? 1 : 0);
