/// <reference types="node" />

export interface ClientOptions {
  /** Your Sahifa API key. Defaults to process.env.SAHIFA_API_KEY. */
  apiKey?: string;
  /** Defaults to https://api.sahifa.dev */
  baseUrl?: string;
  /** Retries on 429, 502, 503, 504 and network errors, honouring Retry-After. Default 3. */
  maxRetries?: number;
  /** Per-request timeout in milliseconds. Default 120000. */
  timeoutMs?: number;
  /** Custom fetch implementation (for tests or proxies). */
  fetch?: typeof fetch;
}

export type Margin = string | { top?: string; right?: string; bottom?: string; left?: string };

export interface HeaderFooter {
  /** HTML; {{page}} and {{total}} are replaced with page numbers. */
  source: string;
  height?: string;
  start_at?: number;
}

/** Options of POST /v3/convert/pdf (PDFShift v3 compatible). */
export interface PdfOptions {
  /** HTML, or a URL starting with http(s)://. */
  source: string;
  format?: 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | string;
  landscape?: boolean;
  margin?: Margin;
  header?: HeaderFooter;
  footer?: HeaderFooter;
  css?: string;
  javascript?: string;
  disable_javascript?: boolean;
  disable_backgrounds?: boolean;
  /** Milliseconds to wait before printing (0 to 10000). */
  delay?: number;
  /** CSS selector or function name to wait for. */
  wait_for?: string;
  /** Seconds (1 to 100). */
  timeout?: number;
  use_print?: boolean;
  /** Page ranges, e.g. "1-3,5". */
  pages?: string;
  zoom?: number;
  http_headers?: Record<string, string>;
  sandbox?: boolean;
  [option: string]: unknown;
}

/** Options of POST /take (ScreenshotOne compatible). */
export interface ScreenshotOptions {
  url?: string;
  html?: string;
  format?: 'png' | 'jpeg' | 'jpg' | 'webp' | 'pdf';
  image_quality?: number;
  full_page?: boolean;
  viewport_width?: number;
  viewport_height?: number;
  device_scale_factor?: number;
  selector?: string;
  omit_background?: boolean;
  dark_mode?: boolean;
  reduced_motion?: boolean;
  /** Seconds (0 to 30). */
  delay?: number;
  /** Seconds (1 to 100). */
  timeout?: number;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  wait_for_selector?: string;
  block_ads?: boolean;
  block_trackers?: boolean;
  block_cookie_banners?: boolean;
  block_chats?: boolean;
  hide_selectors?: string | string[];
  [option: string]: unknown;
}

export declare class SahifaError extends Error {
  /** HTTP status, when the API answered. */
  status?: number;
  /** Machine-readable error code, when the API gives one (e.g. "rate_limited"). */
  code?: string;
  /** Seconds from the Retry-After header, if any. */
  retryAfter?: number;
}

export declare class Sahifa {
  constructor(options?: ClientOptions);
  readonly baseUrl: string;
  /** HTML or a URL to PDF. Resolves to the PDF bytes. */
  pdf(options: PdfOptions): Promise<Buffer>;
  /** Screenshot of a URL or of HTML. Resolves to the image bytes. */
  screenshot(options: ScreenshotOptions): Promise<Buffer>;
}

/** Wraps an HTML fragment in a right-to-left Arabic document with Arabic fonts. */
export declare function arabicDocument(body: string, options?: { lang?: string; title?: string; css?: string }): string;

export default Sahifa;
