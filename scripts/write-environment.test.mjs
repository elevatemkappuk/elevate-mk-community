import assert from 'node:assert/strict';
import test from 'node:test';

import { renderEnvironment } from './write-environment.mjs';

test('renders a normalized API base URL for the Community application', () => {
  assert.equal(
    renderEnvironment('https://community-api.example.test/api/v1/'),
    'export const environment = {\n  apiBaseUrl: "https://community-api.example.test/api/v1",\n};\n',
  );
});

test('rejects non-API or non-HTTP URLs', () => {
  assert.throws(() => renderEnvironment('community-api.example.test'), /absolute http\(s\) URL/);
  assert.throws(() => renderEnvironment('https://example.test'), /ending in \/api\/v1/);
});
