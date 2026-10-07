# Community frontend documentation

This directory documents the member-facing `elevate-mk-community` Angular
application. The application is separate from the Staff CRM frontend and
uses the shared Elevate MK Django API.

## Current documentation

- [Member account lifecycle](./account-lifecycle.md) — Join, account setup,
  sign-in, session restoration, logout and password recovery.
- [Profile V1](./profile.md) — The authenticated composed My Profile,
  self-service editing, review acknowledgement and deferred scope.
- [Deployment and operations](./deployment.md) — Local development,
  deployment configuration, CI checks and session/cookie operations.
- [Community business overview](./community-business-overview.md) — A
  non-technical overview of the product, member journey, current
  capabilities and future scope.

## Documentation areas still to be expanded

- [Connections V1](./connections.md) — Connect discovery, relationship
  lifecycle, privacy rules and frontend workspace behavior.

These areas are not yet covered by the current Community frontend
documentation:

- QR sharing
- CRM staff workflows
- Brevo marketing architecture

Connect discovery, member profiles, My Connections, connection requests and
the Home incoming-request preview are implemented in the current Community
frontend. Their behavior is documented in [Connections V1](./connections.md).
Home does not provide polling, unread state or notification infrastructure.
