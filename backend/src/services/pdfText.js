/* Pulls the text layer out of a PDF, using only Node's built-in zlib.
 *
 * Why not pdfjs-dist: it is a large dependency, and everything this project needs
 * is the plain text — not rendering, fonts or layout. Reading the content streams
 * and inflating them covers the PDFs that resumes actually are.
 *
 * How a PDF stores text: page content is a set of drawing instructions in a
 * stream, usually compressed with FlateDecode (the zlib format). Inflating it
 * gives operators like `(Hello) Tj` — a string to draw — or an array
 * `[(Hel) -2 (lo)] TJ`. So: find the streams, inflate them, harvest the strings.
 *
 * WHAT THIS DOES NOT HANDLE, and would need pdfjs-dist for:
 *   - Encrypted PDFs (a password-protected resume throws)
 *   - Text stored as glyph indices rather than characters (some LaTeX/InDesign
 *     output), which extracts as mojibake
 *   - Scanned resumes with no text layer at all — those are images. They need
 *     OCR, and no text extraction will help.
 * Callers should therefore treat an empty result as "could not read", not as
 * "this resume is empty".
 */
import zlib from "node:zlib";

const STREAM_RE = /stream\r?\n/g;

/** Decodes the escapes allowed inside a PDF literal string. */
function decodePdfString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[++i];
    switch (next) {
      case "n": out += "\n"; break;
      case "r": out += "\r"; break;
      case "t": out += "\t"; break;
      case "b": out += "\b"; break;
      case "f": out += "\f"; break;
      // \( \) \\ are literal characters, so the escape just drops out.
      case "(": case ")": case "\\": out += next; break;
      // A backslash at end of line is a continuation — nothing to emit.
      case "\n": break;
      case "\r": if (raw[i + 1] === "\n") i++; break;
      default:
        // Octal escape, up to 3 digits, e.g. \050 for "(".
        if (/[0-7]/.test(next)) {
          let oct = next;
          while (oct.length < 3 && /[0-7]/.test(raw[i + 1] ?? "")) oct += raw[++i];
          out += String.fromCharCode(parseInt(oct, 8));
        } else {
          out += next; // unknown escape: keep the character
        }
    }
  }
  return out;
}

/** `<48656c6c6f>` style hex strings, common in generated PDFs. */
function decodeHexString(hex) {
  const clean = hex.replace(/\s+/g, "");
  // An odd digit count is malformed; pad so the loop below stays in bounds.
  const padded = clean.length % 2 ? `${clean}0` : clean;
  let out = "";
  for (let i = 0; i < padded.length; i += 2) {
    out += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
  }
  return out;
}

/** Harvests drawable strings from one inflated content stream.
 *
 * Text runs are emitted with a newline when a positioning operator appears
 * (Td/TD/T*), which is what keeps "React" and "MongoDB" from being glued into one
 * token — the analyses downstream match whole words.
 */
function textFromContentStream(content) {
  const chunks = [];
  let pending = [];

  const flush = () => {
    if (pending.length) {
      chunks.push(pending.join(""));
      pending = [];
    }
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    // A positioning operator means a new line of text.
    if (/[Tt]/.test(ch)) {
      const op = content.slice(i, i + 2);
      if (op === "Td" || op === "TD" || op === "T*") {
        flush();
        chunks.push("\n");
        i++;
        continue;
      }
    }

    if (ch === "(") {
      // Walk to the matching ")", tracking nesting and escapes — a literal
      // parenthesis inside the string is escaped as \(, but nested unescaped
      // parens are legal too.
      let depth = 1;
      let raw = "";
      while (++i < content.length) {
        const c = content[i];
        if (c === "\\") {
          raw += c + (content[i + 1] ?? "");
          i++;
          continue;
        }
        if (c === "(") depth++;
        if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
        raw += c;
      }
      pending.push(decodePdfString(raw));
      continue;
    }

    if (ch === "<" && content[i + 1] !== "<") {
      const end = content.indexOf(">", i);
      if (end > -1) {
        const hex = content.slice(i + 1, end);
        if (/^[0-9A-Fa-f\s]+$/.test(hex)) pending.push(decodeHexString(hex));
        i = end;
      }
    }
  }

  flush();
  return chunks.join("");
}

/** Inflates a stream body, or returns null if it is not zlib data. */
function inflate(buf) {
  try {
    return zlib.inflateSync(buf).toString("latin1");
  } catch {
    // Not FlateDecode, or a truncated stream. Try raw deflate before giving up.
    try {
      return zlib.inflateRawSync(buf).toString("latin1");
    } catch {
      return null;
    }
  }
}

/**
 * @param {Buffer} buffer the uploaded PDF
 * @returns {string} extracted text, whitespace-collapsed. "" if nothing readable.
 */
export function extractPdfText(buffer) {
  const blob = buffer.toString("latin1");
  let text = "";

  STREAM_RE.lastIndex = 0;
  let match;

  while ((match = STREAM_RE.exec(blob)) !== null) {
    const start = match.index + match[0].length;
    const end = blob.indexOf("endstream", start);
    if (end === -1) break;

    const body = Buffer.from(blob.slice(start, end), "latin1");
    if (!body.length) continue;

    const inflated = inflate(body);
    // A stream that is not compressed is already plain content, but only treat it
    // as text if it actually looks like content operators — otherwise this would
    // collect image and font data too.
    if (inflated !== null) {
      text += textFromContentStream(inflated);
    } else {
      const raw = body.toString("latin1");
      if (/(\(|<)[^)]{0,200}(Tj|TJ)/.test(raw)) text += textFromContentStream(raw);
    }
  }

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
