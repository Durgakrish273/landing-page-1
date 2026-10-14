/* E2Shipped — mock resume scanner.
 *
 * No PDF is actually parsed here. Parsing a real PDF means pulling its text
 * layer out (pdf.js: getTextContent() per page) and matching that text against
 * a skill dictionary. This file fakes that pipeline so the UI can be built and
 * demoed end to end: same steps, same states, same output shape — the score is
 * derived from the file's name and size so it is stable across reloads.
 */

const MAX_BYTES = 5 * 1024 * 1024;

const SKILL_POOL = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "HTML", "CSS",
  "Tailwind", "REST APIs", "GraphQL", "SQL", "PostgreSQL", "MongoDB", "Git",
  "Docker", "AWS", "CI/CD", "Jest", "Python", "Pandas", "Accessibility",
  "Performance", "Testing", "System Design", "Redux", "Next.js",
];

// Skills a hiring manager tends to expect for a frontend-leaning role, so an
// "missing" list has something realistic to say. Order matters only visually.
const HIGH_VALUE = [
  "TypeScript", "React", "Testing", "CI/CD", "Docker", "REST APIs",
  "Accessibility", "Performance",
];

const els = {
  upload: document.getElementById("pane-upload"),
  loading: document.getElementById("pane-loading"),
  results: document.getElementById("pane-results"),
  dropzone: document.getElementById("dropzone"),
  input: document.getElementById("file-input"),
  error: document.getElementById("error"),
  loadingName: document.getElementById("loading-name"),
  bar: document.getElementById("progress-bar"),
  steps: [...document.querySelectorAll("#steps li")],
  gauge: document.getElementById("gauge-fill"),
  score: document.getElementById("score"),
  verdict: document.getElementById("verdict"),
  meta: document.getElementById("file-meta"),
  note: document.getElementById("summary-line"),
  foundList: document.getElementById("found-skills"),
  missingList: document.getElementById("missing-skills"),
  foundCount: document.getElementById("found-count"),
  missingCount: document.getElementById("missing-count"),
  again: document.getElementById("again-btn"),
};

const CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in the gauge SVG

/* ---------- upload wiring ---------- */

els.dropzone.addEventListener("click", () => els.input.click());

els.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    els.input.click();
  }
});

els.input.addEventListener("change", () => {
  if (els.input.files[0]) handleFile(els.input.files[0]);
});

["dragenter", "dragover"].forEach((type) =>
  els.dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("is-dragging");
  })
);

["dragleave", "drop"].forEach((type) =>
  els.dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("is-dragging");
  })
);

els.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

els.again.addEventListener("click", reset);

/* ---------- the fake scan ---------- */

function handleFile(file) {
  const problem = validate(file);
  if (problem) {
    els.error.textContent = problem;
    els.error.hidden = false;
    return;
  }

  els.error.hidden = true;
  show(els.loading);
  els.loadingName.textContent = file.name;
  els.bar.style.width = "0%";
  els.steps.forEach((li) => li.classList.remove("is-done"));

  runSteps(() => {
    const result = analyse(file);
    render(result, file);
    show(els.results);
  });
}

function validate(file) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return `"${file.name}" is not a PDF. Upload a .pdf file.`;
  if (file.size > MAX_BYTES) return "That file is larger than 5 MB. Try a smaller PDF.";
  return null;
}

/* Walks the three steps with a progress bar. Each step is 1/3 of the width. */
function runSteps(done) {
  let i = 0;
  const tick = () => {
    if (i > 0) els.steps[i - 1].classList.add("is-done");
    if (i === els.steps.length) {
      els.bar.style.width = "100%";
      setTimeout(done, 350);
      return;
    }
    els.bar.style.width = `${((i + 1) / els.steps.length) * 100}%`;
    els.steps[i].classList.add("is-done");
    i++;
    setTimeout(tick, 650);
  };
  tick();
}

/* Stable pseudo-random number from a string — same file, same score. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

function analyse(file) {
  const seed = hash(`${file.name}:${file.size}`);
  const score = Math.round(46 + seed * 46); // 46..92 — believable, never perfect

  const count = 7 + Math.round(seed * 6); // 7..13 skills found
  const found = SKILL_POOL.slice()
    .sort((a, b) => hash(a + file.name) - hash(b + file.name))
    .slice(0, count);

  // Missing = high-value skills the "resume" didn't surface.
  const missing = HIGH_VALUE.filter((s) => !found.includes(s));
  if (missing.length < 3) {
    missing.push(
      ...SKILL_POOL.filter((s) => !found.includes(s) && !missing.includes(s)).slice(0, 3 - missing.length)
    );
  }

  return { score, found, missing };
}

/* ---------- rendering ---------- */

function render({ score, found, missing }, file) {
  els.gauge.style.strokeDasharray = CIRCUMFERENCE;
  els.gauge.style.strokeDashoffset = CIRCUMFERENCE;
  els.gauge.style.stroke =
    score >= 75 ? "var(--good)" : score >= 55 ? "var(--primary)" : "var(--bad)";

  els.score.textContent = "0";
  els.verdict.textContent = verdictFor(score);
  els.meta.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
  els.note.textContent = noteFor(score, found.length, missing.length);

  // Chips first so the count badges agree with what is on screen.
  fill(els.foundList, found, "good");
  fill(els.missingList, missing, "bad");
  els.foundCount.textContent = found.length;
  els.missingCount.textContent = missing.length;

  // Animate the arc and the number together.
  requestAnimationFrame(() => {
    els.gauge.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
  });
  countUp(els.score, score);
}

function fill(list, skills, tone) {
  list.className = `chips chips--${tone}`;
  list.innerHTML = "";
  if (!skills.length) {
    const li = document.createElement("li");
    li.className = "is-empty";
    li.textContent = tone === "good" ? "Nothing detected" : "No gaps found 🎉";
    list.append(li);
    return;
  }
  for (const skill of skills) {
    const li = document.createElement("li");
    li.textContent = skill;
    list.append(li);
  }
}

function countUp(el, target) {
  const duration = 900;
  const start = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))); // ease-out
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function verdictFor(score) {
  if (score >= 80) return "Strong match";
  if (score >= 65) return "Solid, some gaps";
  if (score >= 50) return "Needs work";
  return "Getting filtered out";
}

function noteFor(score, found, missing) {
  if (score >= 75)
    return `${found} skills matched and ${missing} gaps left. Tighten the gaps and this clears most filters.`;
  if (score >= 55)
    return `${found} skills matched, ${missing} missing. The missing list is where the next rewrite should go.`;
  return `Only ${found} skills matched against ${missing} expected ones. Add the missing keywords where you actually used them.`;
}

/* ---------- view switching ---------- */

function show(pane) {
  for (const p of [els.upload, els.loading, els.results]) p.hidden = p !== pane;
}

function reset() {
  els.input.value = ""; // lets the same file be picked again
  els.error.hidden = true;
  show(els.upload);
}
