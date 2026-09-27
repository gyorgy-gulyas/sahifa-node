import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sahifa, SahifaError, arabicDocument } from '../src/index.js';

function fakeFetch(responses) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = responses.shift();
    return new Response(r.body ?? null, { status: r.status ?? 200, headers: r.headers ?? {} });
  };
  return { f, calls };
}

test('pdf() posts to /v3/convert/pdf with the key and returns the bytes', async () => {
  const { f, calls } = fakeFetch([{ body: '%PDF-1.7 test' }]);
  const s = new Sahifa({ apiKey: 'sk_test', fetch: f });
  const pdf = await s.pdf({ source: '<p>مرحبا</p>', format: 'A4' });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal(calls[0].url, 'https://api.sahifa.dev/v3/convert/pdf');
  assert.equal(calls[0].init.headers['X-API-Key'], 'sk_test');
  assert.deepEqual(calls[0].body, { source: '<p>مرحبا</p>', format: 'A4' });
});

test('screenshot() posts to /take and needs exactly one of url or html', async () => {
  const { f, calls } = fakeFetch([{ body: 'png' }]);
  const s = new Sahifa({ apiKey: 'k', fetch: f, baseUrl: 'https://example.test/' });
  await s.screenshot({ url: 'https://example.com', full_page: true });
  assert.equal(calls[0].url, 'https://example.test/take');
  assert.equal(calls[0].init.headers['X-Access-Key'], 'k');
  await assert.rejects(s.screenshot({}), SahifaError);
  await assert.rejects(s.screenshot({ url: 'a', html: 'b' }), SahifaError);
});

test('retries on 429 and 503 using Retry-After, then succeeds', async () => {
  const { f, calls } = fakeFetch([
    { status: 429, headers: { 'retry-after': '0' }, body: JSON.stringify({ error: 'busy' }) },
    { status: 503, body: JSON.stringify({ error: 'down' }) },
    { body: '%PDF' },
  ]);
  const s = new Sahifa({ apiKey: 'k', fetch: f });
  s.maxRetries = 3;
  const t0 = Date.now();
  await s.pdf({ source: 'x' });
  assert.equal(calls.length, 3);
  assert.ok(Date.now() - t0 < 5000);
});

test('errors carry the status, the API message and the code; 400 is not retried', async () => {
  const { f, calls } = fakeFetch([{ status: 400, body: JSON.stringify({ success: false, error: 'source is required', error_code: 'invalid' }) }]);
  const s = new Sahifa({ apiKey: 'k', fetch: f });
  const err = await s.pdf({ source: 'x' }).catch((e) => e);
  assert.ok(err instanceof SahifaError);
  assert.equal(err.status, 400);
  assert.equal(err.code, 'invalid');
  assert.equal(err.message, 'source is required');
  assert.equal(calls.length, 1);
});

test('the key comes from SAHIFA_API_KEY; without one the constructor explains where to get it', () => {
  const saved = process.env.SAHIFA_API_KEY;
  delete process.env.SAHIFA_API_KEY;
  assert.throws(() => new Sahifa(), /SAHIFA_API_KEY/);
  process.env.SAHIFA_API_KEY = 'from-env';
  assert.ok(new Sahifa());
  if (saved === undefined) delete process.env.SAHIFA_API_KEY; else process.env.SAHIFA_API_KEY = saved;
});

test('arabicDocument() wraps fragments in an RTL document and leaves full documents alone', () => {
  const doc = arabicDocument('<h1>فاتورة</h1>', { title: 'A & B' });
  assert.match(doc, /<html dir="rtl" lang="ar">/);
  assert.match(doc, /<title>A &amp; B<\/title>/);
  assert.match(doc, /Noto Naskh Arabic/);
  assert.equal(arabicDocument('<html><body>x</body></html>'), '<html><body>x</body></html>');
});

test('the API key is not exposed as an enumerable property', () => {
  const s = new Sahifa({ apiKey: 'sk_secret' });
  assert.doesNotMatch(JSON.stringify(s), /sk_secret/);
});
