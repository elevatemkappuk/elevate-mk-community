import assert from 'node:assert/strict';
import test from 'node:test';

import { renderEnvironment } from './write-environment.mjs';

test('renders a normalized API base URL for the Community application', () => {
  assert.equal(
    renderEnvironment('https://community-api.staging.elevatemk.org/api/v1/'),
    'export const environment = {\n  apiBaseUrl: "https://community-api.staging.elevatemk.org/api/v1",\n};\n',
  );
});

test('accepts the approved production Community API hostname', () => {
  assert.match(
    renderEnvironment('https://community-api.elevatemk.org/api/v1'),
    /https:\/\/community-api\.elevatemk\.org\/api\/v1/,
  );
});

test('rejects non-API or non-HTTP URLs', () => {
  assert.throws(() => renderEnvironment('community-api.example.test'), /absolute http\(s\) URL/);
  assert.throws(() => renderEnvironment('https://example.test'), /ending in \/api\/v1/);
});
