import { useCallback, useEffect, useRef, useState } from "react";
import UploadPane from "./scanner/UploadPane.jsx";
import LoadingPane from "./scanner/LoadingPane.jsx";
import ResultsPane from "./scanner/ResultsPane.jsx";
import { compareResume } from "../lib/api.js";

/* The scanner is a small state machine: upload -> loading -> results.
 *
 * Only one `status` value drives the whole card, and each pane is the render of
 * one state. The difference from the earlier version is what "loading" now
 * means: it is a real request to the Express API, not a fake timer, so two
 * things that did not exist before have to be handled — a request that fails,
 * and a response that arrives after the learner has moved on.
 */
export default function Scanner() {
  const [status, setStatus] = useState("upload");
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  /* Which request is current. Bumped when a new one starts and on unmount, so a
   * slow earlier response cannot overwrite a newer one — the classic
   * out-of-order-response bug. The API does not stream yet, but this is also
   * what makes a cancel safe later. */
  const requestId = useRef(0);

  const handleFile = useCallback((picked) => {
    setError(null);
    setFile(picked);
    // Picking a new file clears the previous verdict, so a stale score is never
    // shown next to a different filename.
    setResult(null);
  }, []);

  const handleCompare = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    setStatus("loading");

    try {
      const comparison = await compareResume({ file, jobDescription });
      if (id !== requestId.current) return; // superseded or unmounted
      setResult(comparison);
      setStatus("results");
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message);
      // Back to the form, not a dead loading screen — the job description they
      // pasted is still in state, so retrying costs them nothing.
      setStatus("upload");
    }
  }, [file, jobDescription]);

  const reset = useCallback(() => {
    // Clearing the input's value is what lets the learner pick the same file
    // again — browsers ignore a change event for an unchanged file.
    if (inputRef.current) inputRef.current.value = "";
    requestId.current++; // invalidate any in-flight request
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("upload");
  }, []);

  useEffect(() => () => void requestId.current++, []);

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
              file={file}
              jobDescription={jobDescription}
              onJobDescriptionChange={setJobDescription}
              onFile={handleFile}
              onCompare={handleCompare}
              error={error}
            />
          )}

          {status === "loading" && (
            <LoadingPane fileName={file?.name ?? "resume.pdf"} />
          )}

          {status === "results" && (
            <ResultsPane result={result} onReset={reset} />
          )}
        </div>
      </div>
    </section>
  );
}
