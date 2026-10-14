import { useRef, useState } from "react";
import { MAX_BYTES, formatSize, validateFile } from "../../lib/format.js";

export default function UploadPane({
  inputRef,
  file,
  jobDescription,
  onJobDescriptionChange,
  onFile,
  onCompare,
  error,
}) {
  const [dragging, setDragging] = useState(false);
  // Local, because it is about what was just picked, not about the app's state.
  const [pickError, setPickError] = useState(null);

  const stop = (e) => e.preventDefault();

  const accept = (picked) => {
    const problem = validateFile(picked);
    if (problem) {
      setPickError(problem);
      return;
    }
    setPickError(null);
    onFile(picked);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) accept(dropped);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const canCompare = Boolean(file) && jobDescription.trim().length >= 20;

  return (
    <div className="pane">
      <h2 className="card__title">Match your resume to a job</h2>
      <p className="card__sub">
        Upload your resume and paste the job description. PDF only, up to 5&nbsp;MB.
      </p>

      <div className="compare-grid">
        <div className="compare-grid__col">
          <div
            className={`dropzone${dragging ? " is-dragging" : ""}${
              file ? " is-filled" : ""
            }`}
            tabIndex={0}
            role="button"
            aria-label="Choose a PDF resume to compare"
            onClick={() => inputRef.current?.click()}
            onKeyDown={onKeyDown}
            onDragEnter={(e) => {
              stop(e);
              setDragging(true);
            }}
            onDragOver={(e) => {
              stop(e);
              setDragging(true);
            }}
            onDragLeave={(e) => {
              stop(e);
              setDragging(false);
            }}
            onDrop={onDrop}
          >
            <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>

            {file ? (
              <>
                <p className="dropzone__text">
                  <strong>{file.name}</strong>
                </p>
                <p className="dropzone__hint">
                  {formatSize(file.size)} · click to replace
                </p>
              </>
            ) : (
              <>
                <p className="dropzone__text">
                  <strong>Drop your PDF here</strong> or{" "}
                  <span className="link">browse files</span>
                </p>
                <p className="dropzone__hint">resume.pdf</p>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) accept(picked);
              }}
            />
          </div>
        </div>

        <div className="compare-grid__col">
          <label className="field">
            <span className="field__label">Job description</span>
            <textarea
              className="field__input field__input--area"
              rows={8}
              placeholder="Paste the job posting here — responsibilities, requirements, the lot."
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
            />
            <span className="field__hint">
              {jobDescription.trim().length === 0
                ? "At least 20 characters."
                : `${jobDescription.trim().length} characters`}
            </span>
          </label>
        </div>
      </div>

      {(pickError || error) && (
        <p className="error" role="alert">
          {pickError || error}
        </p>
      )}

      <div className="results__actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={onCompare}
          disabled={!canCompare}
        >
          Compare
        </button>
        <p className="disclaimer">
          Matching is keyword-based for now. AI scoring is not wired up yet.
        </p>
      </div>
    </div>
  );
}
