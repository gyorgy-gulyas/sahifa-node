# sahifa

Node.js client for [Sahifa](https://sahifa.dev/en/), the HTML-to-PDF and screenshot API that gets **Arabic and right-to-left text right** and processes documents **in Saudi Arabia**.

- Joined Arabic letters, correct word order, mixed Arabic and English, rendered by Chromium with Arabic fonts preinstalled.
- Documents are rendered in Jeddah and not stored.
- No dependencies; Node.js 18+; TypeScript types included.
- Automatic retries on busy and rate-limit responses.

```
npm install sahifa
```

## Quick start

Get a free API key at [sahifa.dev](https://sahifa.dev/en/account): 100 renders a month, no card needed.

```js
import { writeFile } from 'node:fs/promises';
import { Sahifa, arabicDocument } from 'sahifa';

const sahifa = new Sahifa(); // reads SAHIFA_API_KEY

const pdf = await sahifa.pdf({
  source: arabicDocument('<h1>فاتورة ضريبية مبسطة</h1><p>الإجمالي: <bdi dir="ltr">1,150.00 SAR</bdi></p>'),
  format: 'A4',
  margin: '15mm',
  footer: { source: '<div style="width:100%;text-align:center;font-size:9px">صفحة {{page}} من {{total}}</div>' },
});
await writeFile('invoice.pdf', pdf);
```

## PDF

`sahifa.pdf(options)` calls `POST /v3/convert/pdf`, which is compatible with PDFShift v3, and resolves to a `Buffer`.

| Option | Type | |
|---|---|---|
| `source` | string | HTML, or a URL starting with `http(s)://` (required) |
| `format` | string | `A4` (default), `A3`, `A5`, `Letter`, `Legal`, … |
| `landscape` | boolean | |
| `margin` | string or `{ top, right, bottom, left }` | e.g. `'15mm'` |
| `header`, `footer` | `{ source, height? }` | HTML; `{{page}}` and `{{total}}` are replaced |
| `css`, `javascript` | string | injected before printing |
| `delay` | number | milliseconds to wait (up to 10000) |
| `wait_for` | string | selector or function name to wait for |
| `pages` | string | e.g. `'1-3,5'` |
| `zoom` | number | 0.1 to 2 |

Every option: [PDF reference](https://sahifa.dev/en/docs/pdf).

## Screenshots

`sahifa.screenshot(options)` calls `POST /take`, which is compatible with ScreenshotOne. Pass exactly one of `url` or `html`.

```js
const png = await sahifa.screenshot({
  url: 'https://example.com',
  full_page: true,
  block_cookie_banners: true,
  format: 'png',
});
```

Common options: `format` (`png`, `jpeg`, `webp`, `pdf`), `viewport_width`, `viewport_height`, `device_scale_factor`, `full_page`, `selector`, `dark_mode`, `delay` (seconds), `block_ads`, `block_trackers`, `block_cookie_banners`. See the [screenshot reference](https://sahifa.dev/en/docs/screenshot).

## Arabic helper

`arabicDocument(html, { lang, title, css })` wraps an HTML fragment in a complete document with `dir="rtl"`, UTF-8 and Arabic fonts (Noto Naskh Arabic, Amiri). A full document (starting with `<html` or `<!doctype`) is returned unchanged.

Tips for Arabic documents:

- Wrap left-to-right runs (IBANs, e-mails, SKUs, amounts) in `<bdi dir="ltr">…</bdi>`.
- Use `text-align: start` / `end` instead of `left` / `right`.
- Add the class `num` (tabular digits) to amount columns.

## Errors and retries

Failed requests throw a `SahifaError` with `status`, `code` and `message` from the API. Responses 429, 502, 503 and 504, and network errors, are retried up to `maxRetries` times (default 3), waiting for `Retry-After` when the API sends it.

```js
import { Sahifa, SahifaError } from 'sahifa';

try {
  await sahifa.pdf({ source: html });
} catch (err) {
  if (err instanceof SahifaError && err.status === 402) console.log('Monthly allowance used up');
  else throw err;
}
```

## Options

```js
new Sahifa({
  apiKey: 'sk_live_…',                 // default: process.env.SAHIFA_API_KEY
  baseUrl: 'https://api.sahifa.dev',   // default
  maxRetries: 3,
  timeoutMs: 120000,
});
```

## Links

[Documentation](https://sahifa.dev/en/docs) · [Examples in five languages](https://github.com/gyorgy-gulyas/sahifa-examples) · [Pricing](https://sahifa.dev/en/#pricing) · [Data residency](https://sahifa.dev/en/data-residency) · Support: [support@sahifa.dev](mailto:support@sahifa.dev)

MIT License. Sahifa is a service of Yimello LLC.
