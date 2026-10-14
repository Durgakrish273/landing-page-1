/** Wraps an async handler so a rejected promise reaches the error middleware.
 *
 * Express 4 does not catch rejected promises from handlers - an `await` that
 * throws becomes an unhandled rejection and the request hangs until it times
 * out. Passing every async handler through this turns that into a normal 500.
 * (Express 5 handles this natively, which is the version to move to eventually.) */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
