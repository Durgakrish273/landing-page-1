import { useEffect, useRef, useState } from "react";

/* Animates 0 -> score with an ease-out curve.
 *
 * requestAnimationFrame is right here rather than setInterval: it is driven by
 * the browser's paint cycle, so it pauses in a background tab instead of
 * queueing up work nobody is looking at. The cancel on unmount prevents a state
 * update on a component that has gone away. */
export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const start = performance.now();

    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}
