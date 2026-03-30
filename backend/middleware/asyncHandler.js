// Async Handler Middleware Wrapper
// Purpose: Wraps async route handlers to automatically catch and pass errors to the error handler.
// Problem solved: Without this, unhandled promise rejections in async route handlers would crash the server.
// Usage: Wrap async route handlers like: asyncHandler(async (req, res, next) => { ... })
// How it works:
//   1. Wraps the async function in Promise.resolve()
//   2. Catches any errors from the promise
//   3. Passes errors to the next() middleware (error handler)
//   4. Eliminates try-catch boilerplate in every route handler

/**
 * File: asyncHandler.js
 * Purpose: Async route handler wrapper
 * Description: Wraps async route handlers to catch Promise rejections
 *              and pass errors to the global error handler middleware.
 *              Prevents unhandled promise rejection warnings.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

