import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../js/sanitize.js';

test('escapes imported creator project text before rendering as HTML', () => {
  const unsafeTitle = `<img src=x onerror="alert('creator')"> & draft`;

  assert.equal(
    escapeHtml(unsafeTitle),
    '&lt;img src=x onerror=&quot;alert(&#39;creator&#39;)&quot;&gt; &amp; draft',
  );
});

test('treats empty optional text as safe blank content', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});