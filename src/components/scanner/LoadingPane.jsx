import { useEffect, useState } from "react";

const STEP_LABELS = [
  "Extracting text from PDF",
  "Matching against skill dictionary",
  "Scoring structure and keywords",
];

const STEP_MS = 650;

/* Each step takes STEP_MS; the bar is (steps done / total) wide.
 *
 * The cleanup function is the important part: React StrictMode runs effects
 * twice in development, so a timer that isn't cleared would fire the callback
 * twice and fire onDone twice. Clearing on unmount is also what stops the scan
 * mid-flight if the learner resets. */
export default function LoadingPane({ fileName, onDone }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEP_LABELS.length) {
      const finish = setTimeout(onDone, 350);
      return () => clearTimeout(finish);
    }
    const next = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(next);
  }, [step, onDone]);

  const done = Math.min(step, STEP_LABELS.length);
  const percent = (done / STEP_LABELS.length) * 100;

  return (
    <div className="pane">
      <h2 className="card__title">
        Reading <span>{fileName}</span>
      </h2>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul className="steps">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className={i < step ? "is-done" : undefined}>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
