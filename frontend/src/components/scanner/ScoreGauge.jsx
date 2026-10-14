import { useEffect, useState } from "react";
import { GAUGE_CIRCUMFERENCE, GAUGE_RADIUS, scoreTone } from "../../lib/format.js";
import useCountUp from "../../lib/useCountUp.js";

export default function ScoreGauge({ score }) {
  const shown = useCountUp(score);
  const [offset, setOffset] = useState(GAUGE_CIRCUMFERENCE);

  /* The arc is drawn by hiding part of the circumference with stroke-dashoffset,
   * which is the standard trick for a progress ring: dasharray = full
   * circumference, dashoffset = how much of it to hide (0 = a complete ring).
   *
   * It starts hidden and is set one frame later so the CSS transition on
   * .gauge__fill has a from-value to animate out of. Setting both in the same
   * paint would just show the end state. */
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setOffset(GAUGE_CIRCUMFERENCE * (1 - score / 100))
    );
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div
      className={`gauge gauge--${scoreTone(score)}`}
      role="img"
      aria-label={`Resume score ${score} out of 100`}
    >
      <svg viewBox="0 0 120 120">
        <circle
          className="gauge__track"
          cx="60"
          cy="60"
          r={GAUGE_RADIUS}
        />
        <circle
          className="gauge__fill"
          cx="60"
          cy="60"
          r={GAUGE_RADIUS}
          style={{
            strokeDasharray: GAUGE_CIRCUMFERENCE,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="gauge__value" aria-hidden="true">
        <span>{shown}</span>
        <small>/100</small>
      </div>
    </div>
  );
}
