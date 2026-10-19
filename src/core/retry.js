'use strict';

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('Cancelled')); }, { once: true });
});

/**
 * Retries only when shouldRetry(err) is true (safe, idempotent operations).
 * Honors Retry-After (err.retryAfterMs), exponential backoff with jitter, and AbortSignal.
 */
async function withRetry(fn, { retries = 3, baseMs = 400, maxMs = 8000, signal, shouldRetry = () => true, random = Math.random } = {}) {
  let attempt = 0;
  for (;;) {
    if (signal && signal.aborted) throw new Error('Cancelled');
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err) || (signal && signal.aborted)) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** attempt);
      const delay = err.retryAfterMs != null ? Math.min(err.retryAfterMs, maxMs) : Math.round(backoff * (0.5 + random() * 0.5));
      await sleep(delay, signal);
      attempt += 1;
    }
  }
}

module.exports = { withRetry, sleep };
