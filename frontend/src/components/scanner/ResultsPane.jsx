import ScoreGauge from "./ScoreGauge.jsx";
import SkillChips from "./SkillChips.jsx";
import { formatSize } from "../../lib/format.js";

export default function ResultsPane({ result, onReset }) {
  /* Everything here comes from the API response, so the fields are the server's
   * names, not the old browser-side ones: matchedSkills/missingSkills rather
   * than found/missing, and `summary` is generated server-side. */
  const {
    score,
    verdict,
    summary,
    matchedSkills = [],
    missingSkills = [],
    resume,
    engine,
  } = result;

  const size = resume?.size;

  return (
    <div className="pane">
      <div className="results__head">
        <ScoreGauge score={score} />
        <div className="results__summary">
          {/* aria-live so a screen reader announces the verdict when it lands,
              since the score changes without the learner moving focus. */}
          <h2 className="card__title" aria-live="polite">
            {verdict}
          </h2>
          <p className="card__sub">
            {resume?.originalName}
            {typeof size === "number" ? ` · ${formatSize(size)}` : ""}
          </p>
          <p className="results__note">{summary}</p>
        </div>
      </div>

      <div className="skills">
        <SkillChips
          title="Skills found"
          tone="good"
          skills={matchedSkills}
          empty="Nothing detected"
        />
        <SkillChips
          title="Skills missing"
          tone="bad"
          skills={missingSkills}
          empty="No gaps found 🎉"
        />
      </div>

      <div className="results__actions">
        <button className="btn btn--primary" type="button" onClick={onReset}>
          Compare another resume
        </button>
        <p className="disclaimer">
          {engine === "ai"
            ? "Scored by the AI matcher."
            : "Keyword-based match — AI scoring is not wired up yet."}
        </p>
      </div>
    </div>
  );
}
