/* E2Shipped — mock resume scan logic.
 *
 * Deliberately React-free: everything in here is a plain function, so it can be
 * unit-tested and, later, swapped for a real parser without touching a
 * component. That swap is the one thing to change: replace analyse() with
 * pdf.js (getTextContent() per page) plus keyword matching against SKILL_POOL.
 */

export const MAX_BYTES = 5 * 1024 * 1024;

export const GAUGE_RADIUS = 52;
export const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

export const SKILL_POOL = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "HTML", "CSS",
  "Tailwind", "REST APIs", "GraphQL", "SQL", "PostgreSQL", "MongoDB", "Git",
  "Docker", "AWS", "CI/CD", "Jest", "Python", "Pandas", "Accessibility",
  "Performance", "Testing", "System Design", "Redux", "Next.js",
];

// Skills a hiring manager tends to expect for a frontend-leaning role, so the
// "missing" list has something realistic to say.
export const HIGH_VALUE = [
  "TypeScript", "React", "Testing", "CI/CD", "Docker", "REST APIs",
  "Accessibility", "Performance",
];

/** Rejects a file before we pretend to read it. Returns a message, or null. */
export function validateFile(file) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return `"${file.name}" is not a PDF. Upload a .pdf file.`;
  if (file.size > MAX_BYTES) return "That file is larger than 5 MB. Try a smaller PDF.";
  return null;
}

/* Stable pseudo-random number from a string — same file, same score. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

/** The fake scan. Same file in, same result out. */
export function analyse(file) {
  const seed = hashString(`${file.name}:${file.size}`);
  const score = Math.round(46 + seed * 46); // 46..92 — believable, never perfect

  const count = 7 + Math.round(seed * 6); // 7..13 skills found
  const found = SKILL_POOL.slice()
    .sort((a, b) => hashString(a + file.name) - hashString(b + file.name))
    .slice(0, count);

  // Missing = high-value skills the "resume" didn't surface.
  const missing = HIGH_VALUE.filter((s) => !found.includes(s));
  while (missing.length < 3) {
    const next = SKILL_POOL.find(
      (s) => !found.includes(s) && !missing.includes(s)
    );
    if (!next) break;
    missing.push(next);
  }

  return { score, found, missing };
}

export function verdictFor(score) {
  if (score >= 80) return "Strong match";
  if (score >= 65) return "Solid, some gaps";
  if (score >= 50) return "Needs work";
  return "Getting filtered out";
}

export function noteFor(score, foundCount, missingCount) {
  if (score >= 75)
    return `${foundCount} skills matched and ${missingCount} gaps left. Tighten the gaps and this clears most filters.`;
  if (score >= 55)
    return `${foundCount} skills matched, ${missingCount} missing. The missing list is where the next rewrite should go.`;
  return `Only ${foundCount} skills matched against ${missingCount} expected ones. Add the missing keywords where you actually used them.`;
}

/** Which colour the gauge should be drawn in. */
export function scoreTone(score) {
  if (score >= 75) return "good";
  if (score >= 55) return "ok";
  return "bad";
}

export function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}
