// Sahifa API client for Node.js 18+ (uses the built-in fetch). No dependencies.
// Docs: https://sahifa.dev/en/docs

const DEFAULT_BASE_URL = 'https://api.sahifa.dev';
const RETRYABLE = new Set([429, 502, 503, 504]);

export class SahifaError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, retryAfter?: number }} [info]
   */
  constructor(message, { status, code, retryAfter } = {}) {
    super(message);
    this.name = 'SahifaError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Sahifa {
  /**
   * @param {{ apiKey?: string, baseUrl?: string, maxRetries?: number, timeoutMs?: number, fetch?: typeof fetch }} [options]
   */
  constructor({ apiKey = process.env.SAHIFA_API_KEY, baseUrl = DEFAULT_BASE_URL, maxRetries = 3, timeoutMs = 120_000, fetch: fetchImpl } = {}) {
    if (!apiKey) throw new SahifaError('No API key: pass { apiKey } or set SAHIFA_API_KEY. Get a free key at https://sahifa.dev/en/account');
    this.#apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl ?? globalThis.fetch;
  }

  #apiKey;

  /**
   * HTML or a URL to PDF. Returns the PDF bytes.
   * @param {import('./index').PdfOptions} options
   * @returns {Promise<Buffer>}
   */
  async pdf(options) {
    if (!options?.source) throw new SahifaError('pdf(): "source" (HTML or a URL) is required');
    return this.#request('POST', '/v3/convert/pdf', options);
  }

  /**
   * Screenshot of a URL or of HTML. Returns the image (or PDF) bytes.
   * @param {import('./index').ScreenshotOptions} options
   * @returns {Promise<Buffer>}
   */
  async screenshot(options) {
    if (!options?.url === !options?.html) throw new SahifaError('screenshot(): pass exactly one of "url" or "html"');
    return this.#request('POST', '/take', options);
  }

  async #request(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await this.fetch(this.baseUrl + path, {
          method,
          headers: { 'X-API-Key': this.#apiKey, 'X-Access-Key': this.#apiKey, 'Content-Type': 'application/json', 'User-Agent': 'sahifa-node/1.0.0' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        if (attempt < this.maxRetries) { await sleep(1000 * 2 ** attempt); continue; }
        throw new SahifaError(`Network error: ${err.message}`, { code: 'network' });
      }
      if (res.ok) return Buffer.from(await res.arrayBuffer());

      const retryAfter = Number(res.headers.get('retry-after')) || undefined;
      if (RETRYABLE.has(res.status) && attempt < this.maxRetries) {
        await sleep(Math.min(60, retryAfter ?? 2 ** attempt) * 1000);
        continue;
      }
      let detail = {};
      try { detail = await res.json(); } catch { /* not JSON */ }
      throw new SahifaError(detail.error ?? `HTTP ${res.status}`, { status: res.status, code: detail.error_code, retryAfter });
    }
  }
}

/**
 * Wraps an HTML fragment in a right-to-left Arabic document with Arabic fonts.
 * Pass a full document (starting with <html or <!doctype) and it is returned unchanged.
 * @param {string} body
 * @param {{ lang?: string, title?: string, css?: string }} [options]
 */
export function arabicDocument(body, { lang = 'ar', title = '', css = '' } = {}) {
  if (/^\s*(<!doctype|<html)/i.test(body)) return body;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<!doctype html><html dir="rtl" lang="${esc(lang)}"><head><meta charset="utf-8"><title>${esc(title)}</title>`
    + `<style>body{font-family:'Noto Naskh Arabic','Amiri','Noto Sans Arabic',serif;line-height:1.6}`
    + `.num{font-variant-numeric:tabular-nums}${css}</style></head><body>${body}</body></html>`;
}

export default Sahifa;
