const STEP_LABELS = [
  "Uploading resume",
  "Sending job description",
  "Scoring the match",
];

/* This pane is now purely cosmetic.
 *
 * It used to own the timers that produced the result. It doesn't any more: the
 * request in Scanner.jsx decides when the scan is done, and this component is
 * unmounted when the response lands. All that is left is an indefinite progress
 * animation, so there is no `onDone` to fire and no chance of the animation
 * finishing before the server answers.
 *
 * The bar creeps towards 90% and waits there: a bar that reaches 100% and then
 * sits still is the thing that makes people think an app has hung. */
import { useEffect, useState } from "react";

const STEP_MS = 700;
const MAX_PERCENT = 90;

export default function LoadingPane({ fileName }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEP_LABELS.length) return;
    const next = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(next);
  }, [step]);

  const done = Math.min(step, STEP_LABELS.length);
  const percent = Math.min((done / STEP_LABELS.length) * 100, MAX_PERCENT);

  return (
    <div className="pane">
      <h2 className="card__title">
        Comparing <span>{fileName}</span>
      </h2>
      <p className="card__sub">This can take a moment.</p>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
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
