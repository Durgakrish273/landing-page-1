import ScoreGauge from "./ScoreGauge.jsx";
import SkillChips from "./SkillChips.jsx";
import { formatSize, noteFor, verdictFor } from "../../lib/scan.js";

export default function ResultsPane({ result, file, onReset }) {
  const { score, found, missing } = result;

  return (
    <div className="pane">
      <div className="results__head">
        <ScoreGauge score={score} />
        <div className="results__summary">
          {/* aria-live so a screen reader announces the verdict when it lands,
              since the score changes without the learner moving focus. */}
          <h2 className="card__title" aria-live="polite">
            {verdictFor(score)}
          </h2>
          <p className="card__sub">
            {file.name} · {formatSize(file.size)}
          </p>
          <p className="results__note">
            {noteFor(score, found.length, missing.length)}
          </p>
        </div>
      </div>

      <div className="skills">
        <SkillChips
          title="Skills found"
          tone="good"
          skills={found}
          empty="Nothing detected"
        />
        <SkillChips
          title="Skills missing"
          tone="bad"
          skills={missing}
          empty="No gaps found 🎉"
        />
      </div>

      <div className="results__actions">
        <button className="btn btn--primary" type="button" onClick={onReset}>
          Scan another resume
        </button>
        <p className="disclaimer">
          This is a mock scan — the score is generated in the browser, not parsed
          from your PDF.
        </p>
      </div>
    </div>
  );
}
