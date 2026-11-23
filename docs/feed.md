# Community Feed V1

Community Feed is a purpose-led member space for asking for help, offering
value, sharing genuine opportunities and posting relevant professional or
Community updates. It is not a generic social network: there are no likes,
reactions, shares, ranking, hashtags, media uploads, Events or Messages.

## Member experience

The authenticated Community routes are:

```text
/community/community
/community/community/post/new
/community/community/post/:postId
/community/community/post/:postId/edit
```

The list is chronological and supports the four purpose filters `ALL`, `ASKS`,
`OFFERS`, `OPPORTUNITIES` and `UPDATES`. Loading more is explicit; the UI does
not use infinite scroll. Home shows a maximum of three latest posts and does
not add filters, reply composers or moderation actions to the preview.

## Posts

Create Post requires one purpose, a headline up to 120 characters, a body up
to 2,000 characters and an explicit audience. The default audience is
`ELEVATE_COMMUNITY`; `MY CONNECTIONS` maps to the backend `CONNECTIONS`
audience. The posting guidance asks members to keep contributions useful and
relevant to the Community.

Post creation uses one idempotency key for a logical submission attempt. A
retry of the same ambiguous attempt reuses that key; a new user submission
gets a new key. The UI does not create an optimistic post before backend
confirmation.

Owners can edit their active posts and soft-delete them. Backend capability
fields are authoritative. After any reply has existed, purpose and audience
are locked permanently; headline and body remain editable. The frontend does
not infer this lock from the current visible reply count.

## Conversations

Post detail loads a flat, paginated, oldest-first conversation. Reply-to-reply
references are shown as compact context, not nested branches. Members can
create replies up to 1,000 characters, edit their own reply body, and soft-
delete their own replies. Deleted or unavailable replies remain in the
conversation as backend-provided placeholders and their original body is not
reconstructed client-side.

Reply creation is idempotent and uses the same logical-attempt retry rule as
post creation. Duplicate replay updates the existing local row rather than
duplicating it in the UI.

## Visibility and privacy

Every Feed operation is checked by the backend against current Community
eligibility. Community-wide content is not internet-public. Connections-only
content requires an accepted connection and current eligibility for both the
author and viewer; pending, declined, disconnected, archived, former and
otherwise ineligible relationships do not grant access.

Member Feed projections intentionally omit email, mobile, internal Person or
Membership identifiers, CRM notes/tags, marketing state, provider data, audit
metadata, report counts and reporter/moderator identity. Directory visibility
does not suppress the intentional identity attached to a post or reply.

## Reporting

Members can report visible active posts or replies that they do not own. The
reasons are Off topic, Spam or excessive promotion, Inappropriate or abusive,
Misleading or suspicious, and Other, with optional details up to 1,000
characters. Reporting does not hide content automatically. The UI shows a
restrained acknowledgement and does not reveal report counts or moderation
state.

There is one open report per member and target. Repeating a report is safely
idempotent. Unavailable, deleted, removed and placeholder content is not
reportable.

## Moderation boundary

Moderation is a Staff CRM workflow, not a Community member feature. Active
`CRM_ADMIN` and `CRM_MANAGER` staff can review open reports, dismiss them,
remove active posts/replies, and restore content removed by moderation.
`CRM_VIEWER`, ordinary Community members and unauthenticated users cannot use
the moderation API. Author-deleted content cannot be restored. Resolved report
history is retained but is not currently browsable as a separate CRM history
list.

## Backend contract

The Community frontend uses the shared API service for:

```text
GET    /api/v1/community/posts/
POST   /api/v1/community/posts/
GET    /api/v1/community/posts/{public_id}/
PATCH  /api/v1/community/posts/{public_id}/
DELETE /api/v1/community/posts/{public_id}/
GET    /api/v1/community/posts/{post_id}/replies/
POST   /api/v1/community/posts/{post_id}/replies/
PATCH  /api/v1/community/posts/{post_id}/replies/{reply_id}/
DELETE /api/v1/community/posts/{post_id}/replies/{reply_id}/
POST   /api/v1/community/posts/{post_id}/report/
POST   /api/v1/community/posts/{post_id}/replies/{reply_id}/report/
```

The API repository's `docs/API.md` and `docs/community-platform.md` are the
authoritative backend contract. Feed creation, reply creation and reporting
are CSRF-protected and scoped-throttled; creation operations require
idempotency keys.

## Deferred scope

Feed V1 does not include likes/reactions, shares/reposts, media, ranking,
hashtags, messaging, Events, AI moderation, member blocking or historical
moderation browsing.
