import { useState } from "react";

export default function UploadPane({ inputRef, onFile, error }) {
  const [dragging, setDragging] = useState(false);

  const stop = (e) => e.preventDefault();

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) onFile(dropped);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="pane">
      <h2 className="card__title">Upload your resume</h2>
      <p className="card__sub">
        PDF only, up to 5&nbsp;MB. Nothing leaves your browser.
      </p>

      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Choose a PDF resume to scan"
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
        <p className="dropzone__text">
          <strong>Drop your PDF here</strong> or <span className="link">browse files</span>
        </p>
        <p className="dropzone__hint">resume.pdf</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onFile(picked);
          }}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
