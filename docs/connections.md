# Community Connections V1

Connections is the mutual member-to-member relationship feature in Elevate
MK Community. It is built on the backend Connections API and uses the
privacy-safe Connect Directory projection.

## Member experience

Members enter Connect through the Directory and can use the secondary
navigation to move between:

- **Discover** — browse eligible, directory-visible members;
- **My Connections** — view accepted connections;
- **Requests** — review incoming requests or monitor outgoing requests.

The authenticated Community routes are:

```text
/community/directory
/community/directory/connections
/community/directory/requests?direction=incoming
/community/directory/requests?direction=outgoing
/community/directory/:directoryId
```

Community Home shows a compact preview of up to three incoming requests. It
does not poll for updates, maintain unread counts, or introduce a second
connection state store. Accept and Decline actions refresh the authoritative
backend result.

## Relationship lifecycle

A connection is a mutual relationship between two eligible Community
members. The backend stores one canonical unordered Person pair and exposes
only its opaque public connection identifier to the frontend.

The lifecycle states are:

```text
PENDING -> ACCEPTED
PENDING -> DECLINED
ACCEPTED -> DISCONNECTED
DECLINED/DISCONNECTED -> PENDING   (a later request may reopen the pair)
```

Crossed requests do not auto-accept. The existing pending request remains
available for the recipient's explicit decision. The frontend renders the
backend relationship state and permitted actions rather than deriving state
from local assumptions.

## Eligibility and privacy

The backend is authoritative for every read and mutation. A Community member
must have:

- an authenticated active User;
- a linked non-archived BUSINESS Person; and
- an ACTIVE Membership.

Connection lists and request lists include only currently eligible
participants. A new request can target only a currently eligible,
directory-visible member. A hidden profile can be opened only by an accepted
connection, and only while both participants remain currently eligible.

Pending, declined, disconnected, unrelated, archived, former, inactive, and
otherwise ineligible relationships do not grant hidden-profile access.

Contact data follows the backend privacy rule:

- Directory lists and connection/request cards never include email or mobile;
- non-connected profile viewers see email/mobile only when the corresponding
  Community visibility preference is enabled;
- an accepted, currently effective connection grants both members access to
  each other's canonical email and mobile values where present;
- removing the connection or losing current eligibility removes that
  connection-derived access immediately.

The frontend does not infer contact details, expose internal IDs, or copy
contact data into connection state. Generic not-found and unavailable
responses preserve the backend's enumeration-safe behavior.

## Actions and transport

The frontend uses the shared `CommunityApiService` for request creation,
acceptance, decline, removal, connection lists, and request lists. Unsafe
session-authenticated requests bootstrap CSRF and send credentials through the
existing Community HTTP configuration. The existing backend authorization
rules remain authoritative; retrying a UI action does not create a separate
frontend relationship.

The backend applies scoped throttles for connection reads, request reads,
request creation, and mutations. See the API and deployment documentation for
the current defaults and environment settings.

## Scope boundaries

Connections V1 does not provide messaging, followers, recommendations,
blocking, QR sharing, unread notifications, or a broader social graph.
Email and mobile remain canonical Person data and are not editable through
Connections.

The backend contract and privacy rules are documented in the API repository's
`docs/API.md` and `docs/community-platform.md`.
