/* PLACEHOLDER scoring — NOT AI.
 *
 * This stands in for the model call that will be added later. It is a
 * deterministic keyword comparison: pull the skills out of the job description,
 * decide which the resume "has", and score the overlap. Same inputs, same
 * output, which is what makes it testable and makes the UI look stable.
 *
 * To swap in the real thing, replace the body of analyze() with a call to your
 * model, keep the return shape ({ score, verdict, summary, matchedSkills,
 * missingSkills }), and change `engine` to "ai". Nothing else in the app knows
 * how the number was produced.
 */

export const ENGINE = "placeholder";

const SKILL_POOL = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "HTML", "CSS",
  "Tailwind", "REST APIs", "GraphQL", "SQL", "PostgreSQL", "MongoDB", "Git",
  "Docker", "AWS", "CI/CD", "Jest", "Python", "Pandas", "Accessibility",
  "Performance", "Testing", "System Design", "Redux", "Next.js",
];

/* Stable pseudo-random number from a string — same input, same score. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

/** Which skills in the pool the job description actually mentions. */
function skillsInJobDescription(jobDescription) {
  const haystack = jobDescription.toLowerCase();
  return SKILL_POOL.filter((skill) => {
    // \b word bounds so "Git" does not match "digital" or "React" match "reaction".
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
 * @param {{ resumeName: string, resumeSize: number, jobDescription: string }} input
 */
export function analyze({ resumeName, resumeSize, jobDescription }) {
  const required = skillsInJobDescription(jobDescription);

  // Until the resume is actually parsed, treat a deterministic slice of the
  // required skills as "present" so the two lists are always populated.
  const seed = hashString(`${resumeName}:${resumeSize}:${jobDescription.length}`);
  const matches = required.filter((skill) => hashString(skill + resumeName) > seed * 0.7);

  // Skills the JD asks for that the resume did not show. Fall back to the pool
  // so the list is never empty, even for a one-line job description.
  const missing = required.filter((skill) => !matches.includes(skill));
  for (const skill of SKILL_POOL) {
    if (missing.length >= 3) break;
    if (!matches.includes(skill) && !missing.includes(skill)) missing.push(skill);
  }

  const score = required.length
    ? Math.round(40 + (matches.length / required.length) * 55)
    : Math.round(46 + seed * 46);

  return {
    score: Math.min(97, Math.max(40, score)), // never 0, never a perfect 100
    verdict: verdictFor(score),
    summary: summaryFor(score, matches.length, missing.length),
    matchedSkills: matches,
    missingSkills: missing,
  };
}
