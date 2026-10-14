import multer from "multer";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB, same limit the UI states

/* memoryStorage keeps the file in RAM as a Buffer instead of writing it to
 * disk. That suits this app: the file is read once, parsed to text, and
 * discarded - there is no reason for a user's resume to sit in an uploads/
 * folder. The cost is that a big upload is held in memory, which is the other
 * reason the size limit is enforced here and not only in the browser. */
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (file.mimetype === "application/pdf") return cb(null, true);
  // Passing an Error here surfaces through the error middleware below as a 400.
  cb(Object.assign(new Error("Only PDF files are accepted."), { status: 400 }));
}

export const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single("resume");
