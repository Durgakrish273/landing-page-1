import { useCallback, useEffect, useRef, useState } from "react";
import UploadPane from "./scanner/UploadPane.jsx";
import LoadingPane from "./scanner/LoadingPane.jsx";
import ResultsPane from "./scanner/ResultsPane.jsx";
import { analyse, validateFile } from "../lib/scan.js";

/* The scanner is a small state machine: upload -> loading -> results.
 *
 * One `status` value drives everything; the three panes are just the render of
 * each state, and only one is mounted at a time. That is the whole reason this
 * is nicer in React than in DOM code: in the plain-JS version we were flipping
 * `hidden` on three divs by hand and had to remember to reset them.
 */
export default function Scanner() {
  const [status, setStatus] = useState("upload");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((picked) => {
    const problem = validateFile(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(picked);
    setResult(null);
    setStatus("loading");
  }, []);

  const handleScanDone = useCallback(() => {
    setResult(analyse(file));
    setStatus("results");
  }, [file]);

  const reset = useCallback(() => {
    // Clearing the input's value is what lets the learner pick the same file
    // again — browsers ignore a change event for an unchanged file.
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("upload");
  }, []);

  // Scroll the card into view when results land, but never on first paint.
  const cardRef = useRef(null);
  useEffect(() => {
    if (status === "results") {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [status]);

  return (
    <section className="scan" id="scan">
      <div className="wrap">
        <div className="card card--scanner" ref={cardRef}>
          {status === "upload" && (
            <UploadPane
              inputRef={inputRef}
              onFile={handleFile}
              error={error}
            />
          )}

          {status === "loading" && (
            <LoadingPane fileName={file.name} onDone={handleScanDone} />
          )}

          {status === "results" && (
            <ResultsPane result={result} file={file} onReset={reset} />
          )}
        </div>
      </div>
    </section>
  );
}
