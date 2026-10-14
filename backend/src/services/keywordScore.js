/* Deterministic keyword matching, no network.
 *
 * Two jobs:
 *   1. The fallback when labd is unavailable, out of allowance or switched off.
 *   2. A baseline that needs no API key at all, so the app is usable before
 *      LABD_API_KEY is configured.
 *
 * It reads the real resume text, so unlike the earlier placeholder it is at least
 * a true comparison — it just cannot understand a skill that is written
 * differently from the pool ("built interfaces with hooks" is not "React").
 */

export const SKILL_POOL = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "HTML", "CSS",
  "Tailwind", "REST APIs", "GraphQL", "SQL", "PostgreSQL", "MongoDB", "Git",
  "Docker", "AWS", "CI/CD", "Jest", "Python", "Pandas", "Accessibility",
  "Performance", "Testing", "System Design", "Redux", "Next.js",
];

/* Aliases let one pool entry match how a document actually spells it. Without
 * these, "Node.js" misses a resume that writes "NodeJS" or just "Node". */
const ALIASES = {
  "Node.js": ["node", "nodejs", "node js"],
  "REST APIs": ["rest", "rest api", "restful", "rest apis"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery"],
  SQL: ["sql", "mysql"],
  PostgreSQL: ["postgres", "postgresql"],
  MongoDB: ["mongo", "mongodb"],
  JavaScript: ["javascript", "js", "es6"],
  TypeScript: ["typescript", "ts"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  Git: ["git", "github", "gitlab"],
  AWS: ["aws", "amazon web services"],
  Testing: ["testing", "unit test", "unit tests", "test coverage"],
  Accessibility: ["accessibility", "a11y", "wcag"],
};

function mentions(haystack, skill) {
  const terms = ALIASES[skill] ?? [skill];
  return terms.some((term) => {
    // \b word bounds so "Git" does not match "digital" and "React" does not
    // match "reaction". Escaped because pool entries contain dots and slashes.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
  });
}

function verdictFor(score) {
  if (score >= 80) return "Strong match";
  if (score >= 65) return "Solid, some gaps";
  if (score >= 50) return "Needs work";
  return "Getting filtered out";
}

function summaryFor(score, matched, missing) {
  if (score >= 75)
    return `${matched} skills matched and ${missing} gaps left. Tighten the gaps and this clears most filters.`;
  if (score >= 55)
    return `${matched} skills matched, ${missing} missing. The missing list is where the next rewrite should go.`;
  return `Only ${matched} skills matched against ${missing} expected ones. Add the missing keywords where you actually used them.`;
}

/**
 * @param {{ resumeText: string, jobDescription: string }} input
 */
export function keywordScore({ resumeText, jobDescription }) {
  const jd = (jobDescription ?? "").toLowerCase();
  const resume = (resumeText ?? "").toLowerCase();

  // What the job asks for, and of that, what the resume actually shows.
  const required = SKILL_POOL.filter((skill) => mentions(jd, skill));
  const matched = required.filter((skill) => mentions(resume, skill));

  /* Missing = asked for but absent. When the description names fewer than three
   * skills (a vague posting, or a one-line paste) the list is topped up from the
   * pool so the result is still useful rather than nearly empty. */
  const missing = required.filter((skill) => !matched.includes(skill));
  for (const skill of SKILL_POOL) {
    if (missing.length >= 3) break;
    if (!matched.includes(skill) && !missing.includes(skill)) missing.push(skill);
  }

  /* Ratio-based, not hash-based: the score now moves when the resume text does,
   * which is the entire point of parsing it. */
  const score = required.length
    ? Math.round((matched.length / required.length) * 100)
    : 0;

  return {
    score: Math.max(0, Math.min(100, score)),
    verdict: verdictFor(score),
    summary: summaryFor(score, matched.length, missing.length),
    matchedSkills: matched,
    missingSkills: missing,
  };
}
