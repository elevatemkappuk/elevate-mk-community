# Community frontend deployment and operations

This document covers operational concerns for the member-facing Angular
Community application: local development, API configuration, production
builds, CI validation and coordination with the shared Django API.

It is not a general architecture document. Deployment-provider settings that
are not represented in this repository remain operational configuration.

## Runtime relationship

```text
Community Angular frontend
          |
          | HTTPS API requests
          v
Shared Elevate MK Django API
```

Community is a separate frontend application and does not contain its own
backend. It uses the shared Elevate MK API for data, authentication and
account lifecycle operations.

Authentication uses Django sessions/cookies. Credentialed requests are
required, unsafe requests are CSRF protected, and JWT access tokens are not
used.

## API configuration

The Community deployment variable is:

```text
API_BASE_URL
```

It is build-time configuration, not a member-facing setting or a secret. The
value must be an absolute `http` or `https` URL with a path ending in
`/api/v1`.

Example only:

```text
API_BASE_URL=https://api.example.org/api/v1
```

The repository does not establish `api.example.org` as a live production
hostname. Do not include an endpoint suffix such as `/community/profile/` in
`API_BASE_URL`.

## Environment generation

[`scripts/write-environment.mjs`](../scripts/write-environment.mjs) reads
`API_BASE_URL` when invoked as a deployment script. It trims the value,
removes trailing slashes, validates the absolute HTTP(S) `/api/v1` invariant,
and writes `src/environments/environment.ts`.

The Railway build script is:

```text
npm run build:railway
```

It runs the environment writer and then performs an Angular production build.
If `API_BASE_URL` is missing or invalid, the writer fails with a non-zero exit
status instead of generating an ambiguous API configuration.

The checked-in development environment points to the local API at
`http://localhost:8000/api/v1`. Angular development serving is explicitly
configured for port `4201`.

## Configuration tests

Run:

```text
npm run test:config
```

This executes [`scripts/write-environment.test.mjs`](../scripts/write-environment.test.mjs),
which protects deployment-critical API URL generation by checking valid URL
normalization/generation and rejection of non-HTTP(S) or non-`/api/v1`
configuration.

## Local development

From the Community repository:

```text
npm ci
npm start
```

The development server runs on configured port `4201`.

Other repository scripts are:

```text
npm run test:config
npm test -- --watch=false
npm run build
npm run build:railway
```

The local development build uses `environment.development.ts`; the normal
`build` script uses the production configuration and checked-in
`environment.ts` unless a deployment environment writer has generated it.

## Node and npm baseline

The current tooling baseline is:

- Node `22.12.0` in GitHub Actions;
- npm `10.9.0`, declared by `package.json`;
- `package-lock.json` lockfile version 3;
- `npm ci` for deterministic CI installation.

The manifest and lockfile must remain synchronized. `npm ci` intentionally
rejects dependency drift rather than silently rewriting the lockfile.

## GitHub frontend validation

[`frontend-validation.yml`](../.github/workflows/frontend-validation.yml)
runs for pull requests targeting `staging` or `master`, and pushes to
`staging` or `master`.

The sequence is:

1. install dependencies with `npm ci`;
2. run `npm run test:config`;
3. run the complete Community unit suite with `npm test -- --watch=false`;
4. run the production Angular build with `npm run build`.

The complete suite is used because it is currently small and fast enough that
a selected short suite is unnecessary. Test counts are not a permanent
guarantee.

## Current CI limitations

Community currently has no Playwright/browser E2E suite and no Community
post-deployment staging E2E workflow. This repository also does not record a
verified stable Community staging deployment target.

The current CI gate validates configuration, unit behavior and production
compilation, but not deployed browser behavior. Browser E2E and a safe
staging target are future operational hardening work.

## Production build

Run:

```text
npm run build
```

The Angular production build provides TypeScript compilation, Angular template
compilation, optimized bundle generation and configured bundle/style budget
checks.

The current known non-blocking warning is:

```text
src/app/shared/ui/account-shell/community-account-shell.component.scss
approximately 5.64 kB against a 4.00 kB anyComponentStyle warning budget
```

It does not fail the build and should not be hidden by changing the budget
without a separate decision.

## Session and cookie deployment considerations

Because Community uses Django session authentication, the frontend and API
must be configured as one deployment topology. Verify credentialed requests,
CORS, CSRF trusted origins, secure cookies and `SameSite` behavior together.
The API also needs the correct Community frontend URL for generated
activation and password-reset links.

The verified API settings are:

```text
CORS_ALLOWED_ORIGINS
CORS_ALLOW_CREDENTIALS
CSRF_TRUSTED_ORIGINS
SESSION_COOKIE_SAMESITE
CSRF_COOKIE_SAMESITE
SESSION_COOKIE_SECURE
CSRF_COOKIE_SECURE
COMMUNITY_FRONTEND_URL
```

In the API settings, secure session and CSRF cookies are derived from
production debug state, while the `SameSite` values can be configured through
their named environment settings. `COMMUNITY_FRONTEND_URL` is backend
configuration and must be a frontend base URL, not an activation route.

## Cross-site cookie risk

If Community and the API use unrelated Railway-generated domains, browser
privacy controls may treat the API session cookie as third-party or otherwise
cross-site state. This is particularly relevant to Safari/iOS and
increasingly relevant to other browsers.

For the current cross-site arrangement, `SameSite=None; Secure` is necessary
where configured, but it does not guarantee that every browser will permit
third-party cookie behavior.

## Preferred domain topology

The preferred long-term topology is an architectural recommendation, not a
claim about current deployment:

```text
https://community.elevatemk.org
https://api.elevatemk.org
```

Using a Community hostname and sibling API hostname keeps the applications on
different origins while sharing a parent site. This is a better fit for
Django session/cookie authentication than relying on unrelated
`*.up.railway.app` domains.

The repositories do not establish both names as currently live. Configure the
actual production values operationally and list the exact Community origin in
the API CORS and CSRF settings.

## CSRF deployment behavior

The frontend obtains CSRF state from `GET /api/v1/auth/csrf/`, keeps the
current token in frontend memory, sends `X-CSRFToken` on unsafe requests and
sends API requests with credentials. It does not depend on reading the
API-origin CSRF cookie. Login and activation refresh CSRF state after Django
rotates it during authentication.

## Deployment checklist

- [ ] API is deployed and reachable from the intended Community origin.
- [ ] `API_BASE_URL` is an absolute HTTP(S) `/api/v1` URL.
- [ ] The Community origin is in API `CORS_ALLOWED_ORIGINS`.
- [ ] The Community origin is in API `CSRF_TRUSTED_ORIGINS`.
- [ ] Secure cookie and `SameSite` settings are appropriate for HTTPS.
- [ ] API `COMMUNITY_FRONTEND_URL` points to the Community base origin for
      activation and password-reset links.
- [ ] The backend background worker is available for lifecycle jobs.
- [ ] The production Angular build succeeds.
- [ ] GitHub Frontend Validation is green.
- [ ] Login and session restoration work after refresh.
- [ ] An authenticated write works.
- [ ] Logout returns the member to the public flow.
- [ ] An activation URL reaches the intended Community route.
- [ ] A password-reset URL reaches the intended Community route.

## Browser smoke tests

Until Community browser E2E exists, exercise the deployed application
manually in Chrome and, where available, Safari. Include iPhone Safari and
Android Chrome checks for mobile behavior.

Core authenticated flow:

```text
login
  → Community me/session restoration
  → refresh
  → authenticated write
  → logout
  → login again
```

Also verify activation reaches `/activate/:invitationId/:token` and
password reset reaches `/reset-password/:uid/:token`.

## Background worker dependency

Community account lifecycle features depend on backend processing for
transactional email and marketing/profile synchronization jobs. The verified
backend worker command is:

```text
python manage.py process_background_jobs --watch
```

This runs in the API/backend deployment, not in the Angular Community
service.

## Dependency audit

Dependency review may be run with:

```text
npm audit
```

At the latest CI setup checkpoint the Community repository reported zero known
audit vulnerabilities. This is a point-in-time observation, and `npm audit`
is not currently a blocking GitHub workflow step.

## Railway

The Community frontend is intended to be deployed independently from the
separate API Railway service/application deployment. `API_BASE_URL` connects
the frontend build configuration to that API.

Repository configuration does not establish Railway service IDs, project IDs,
environment names, deployment commands or a stable Community domain. Those
values are configured operationally in Railway and should not be inferred
from this document.

## Secrets

`API_BASE_URL` is configuration, not a secret. The Angular frontend must not
receive backend secrets such as Django `SECRET_KEY`, database credentials,
Brevo API keys or provider credentials.

## Troubleshooting

### `npm ci` reports a package/lock mismatch

Synchronize `package-lock.json` using npm `10.9.0`. Do not replace `npm ci`
with `npm install` in CI merely to bypass lockfile drift.

### API URL configuration fails

Verify that `API_BASE_URL` is an absolute HTTP(S) URL ending in `/api/v1`.

### Login succeeds but the session is not retained

Inspect credentialed requests, CORS, secure cookies, `SameSite` behavior,
cookie domain/topology and the exact frontend/API origins.

### An unsafe request receives a CSRF failure

Inspect CSRF bootstrap, the in-memory `X-CSRFToken` header, credentials,
`CSRF_TRUSTED_ORIGINS` and cookie settings.

### Activation or reset links point to the wrong frontend

Inspect the API's `COMMUNITY_FRONTEND_URL` value. It should contain only the
Community frontend base URL, without a route, fragment or inline comment.

## Out of scope

This document does not define deployment for Profile Photo storage,
Directory, QR functionality, Community Playwright, Community staging E2E,
speculative CDN/object storage or future deployment providers.
