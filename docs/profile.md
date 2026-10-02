# Community Profile V1

## Overview

My Profile is the authenticated member's owner-facing profile experience in
the Community application. It is a composed view of canonical Elevate MK
member data and Community-owned extension state, not a second identity
database.

Three concepts are deliberately distinct:

- **My Profile** is the authenticated member's composed profile and
  self-service editing experience.
- **CommunityProfile** is a backend Community-owned one-to-one extension
  attached to `Person`. It stores Community-specific state only.
- **Directory Profile** is a future privacy-safe projection intended for
  other Community members. It is not implemented in Profile V1.

The frontend is separate from the Staff CRM frontend. The shared Django API
owns authorization, canonical data, completion rules and profile mutation.

## Architecture and ownership

My Profile is composed from these existing backend domains:

- `Person`
- `ProfessionalProfile`
- `Membership`
- `PersonSkill` / `Skill`
- `PersonInterest` / `Interest`
- `CommunityProfile`

Canonical names, location, professional details, membership and taxonomy
relationships remain in their existing shared models. `CommunityProfile` is
not another `Person`, `User`, `Membership` or `ProfessionalProfile`, and it
does not copy those records.

Current `CommunityProfile` state is:

- `bio`;
- `person_preexisted_community`, which records existing-record provenance;
- `review_acknowledged_at`, which records explicit review acknowledgement;
- creation and update timestamps.

Future Community-specific state may extend this model, but Profile V1 does
not define photo, directory or sharing fields.

## Routes and APIs

Authenticated Community routes are protected by the frontend auth guard and
backend Community eligibility checks:

```text
/community/profile
/community/profile/edit
```

The frontend guard improves navigation UX by redirecting unauthenticated or
ineligible users to `/join`. It is not a security boundary; the backend
derives the current `Person` from the authenticated session and authorizes
each request.

### Read profile

```text
GET /api/v1/community/profile/
```

The response is a Community-safe composed DTO with these sections:

```text
person:
  first_name
  last_name
  location
community:
  bio
  review_required
professional:
  job_title
  company
  industry: { id, slug, label } | null
  career_stage
  linkedin_url
skills: [{ id, name, slug }]
interests: [{ id, name, slug }]
membership:
  status
  joined_at
completion:
  name
  professional_details
  bio
  skills
  interests
```

The endpoint lazily creates the CommunityProfile extension if the eligible
member does not have one yet, while keeping the response composed from the
canonical records.

### Edit profile

```text
PATCH /api/v1/community/profile/
```

The request is a partial update. The top-level sections are `person`,
`community`, `professional`, `skills` and `interests`; unknown fields are
rejected. The successful response returns the fresh authoritative composed
profile, including recalculated completion.

### Profile options

```text
GET /api/v1/community/profile/options/
```

The response contains:

- `industries`
- `career_stages`
- `skills`
- `interests`

Each option is `{ slug, label }`. Options are backend-authoritative. Active
canonical industries, skills and interests are returned; career stages come
from the canonical professional choices. The frontend does not create
arbitrary taxonomy values.

### Review acknowledgement

```text
POST /api/v1/community/profile/review-acknowledgement/
```

The request has no member identifier or editable payload. The response is:

```json
{ "review_required": false }
```

It acts only on the current eligible member, is idempotent, and lets the
server establish the acknowledgement timestamp. It does not alter
`person_preexisted_community` or canonical profile fields.

Unsafe profile requests are sent with the application's Django session and
CSRF handling.

## Read-only My Profile

The read-only page provides:

- the authenticated Community header/navigation;
- an initials avatar fallback;
- member name, professional summary and location;
- active membership context and member-since date;
- an Edit profile action;
- the About You / Community story section;
- Professional details;
- Skills;
- Interests;
- Profile Progress;
- an existing-details review banner when required.

Loading has a dedicated state and failed loading shows a safe retry state
without exposing raw backend error details.

The projection intentionally omits internal and staff-facing information,
including:

- email and mobile;
- gender and age range;
- internal CRM tags and notes;
- audit history and import provenance;
- staff roles and User internals;
- marketing administration;
- Brevo/provider state;
- invitation and email-job internals;
- `person_preexisted_community`;
- `review_acknowledged_at`.

Only the derived `review_required` boolean is exposed for the review flow.

## Editing

Eligible members can edit the following canonical/member-owned data:

### Person

- `first_name`
- `last_name`
- `location`

### ProfessionalProfile

- `job_title`
- `company`
- `industry`
- `career_stage`
- `linkedin_url`

The professional record is created when it does not exist. Industry is
selected from active backend options, career stage uses canonical backend
choices, and LinkedIn URL validation remains backend-authoritative.

### CommunityProfile

- `bio`

Bio is plain text, limited to 400 characters, editable by the member and
included in completion.

### Relationships

- `skills`
- `interests`

Edits to Person and ProfessionalProfile update the same canonical records
used by CRM. Community does not maintain a separate copy.

Profile V1 does not allow self-service mutation of:

- email or mobile;
- gender or age range;
- Person type or archive state;
- Membership state;
- marketing preferences;
- tags or notes;
- staff roles;
- User/account state;
- invitation state;
- provider/Brevo state;
- review provenance directly.

### Name normalization

Community self-service name updates normalize surrounding and repeated
whitespace. Clearly all-lowercase or all-uppercase names may receive
conservative human-readable casing. Meaningful mixed casing is preserved
where possible; the service does not blindly apply universal title casing.

Authenticated profile editing may update canonical Person names. This differs
from anonymous Join enrichment, which protects populated canonical values.

## Skills and interests

The editor uses a compact searchable multi-select rather than a fixed
checkbox matrix:

- selected values appear as removable chips;
- **Add skills** and **Add interests** open the corresponding selector;
- only backend-provided canonical options are available;
- selected values are excluded from available results;
- selecting an option immediately adds its chip;
- removing a chip changes the pending form state;
- an empty selection can intentionally clear the relationship;
- keyboard interaction and visible focus states are supported;
- Escape and outside click close the selector;
- opening one selector closes the other;
- the results area scrolls instead of expanding the page indefinitely.

The API receives stable slug arrays. For both `skills` and `interests`:

- omitted means unchanged;
- supplied values replace the current relationship;
- `[]` intentionally clears it;
- only active valid taxonomy slugs are accepted.

## Profile completion

Completion is calculated by the backend and returned as:

```json
{
  "name": true,
  "professional_details": false,
  "bio": true,
  "skills": false,
  "interests": true
}
```

The current completion areas are Name, Professional details, Bio, Skills and
Interests. The backend defines the rules; Angular renders the returned state
and does not reimplement completion business logic. After a successful PATCH,
the authoritative response is used so progress updates immediately.

## Existing-details review

An eligible member may see a **Check your details** banner when their Person
record existed before their Community relationship. The backend derives:

```text
review_required = person_preexisted_community
                  AND review_acknowledged_at IS NULL
```

This asks the authenticated member to verify that canonical information is
current. It is not an approval workflow.

### Review Profile

**Review profile** opens Edit Profile and carries review context into that
page. Opening the editor does not acknowledge the review, and editing alone
does not silently acknowledge it.

When the banner is active, the editor shows an explicit acknowledgement
checkbox: “I've reviewed my profile and the information is up to date.”
After a successful profile PATCH, the frontend separately calls the review
acknowledgement endpoint. The banner is dismissed only after that call
succeeds. Acknowledgement failure leaves the UI truthful: the profile may
have saved, but the review remains unconfirmed and an error is shown.

### Looks good

**Looks good** acknowledges the review directly without requiring an edit. It
uses the same backend acknowledgement behavior, removes the banner only after
success, and reports failure without pretending that the review was
acknowledged.

## No field-by-field Join conflict UI

Profile V1 deliberately distinguishes identity contradictions from ordinary
profile differences.

Email/mobile identity evidence is handled safely by the backend during
anonymous Join and may produce a generic review-required outcome. The
frontend does not expose the underlying CRM record or contradictory fields.

Differences in ordinary profile data—such as location, job title or
industry—are not disclosed as field-by-field conflicts during anonymous Join.
After authentication, the member sees the canonical profile and can review
or update it. This protects CRM confidentiality and keeps the review
experience understandable rather than exposing an internal reconciliation
interface.

## Transactions, audit and Brevo

Profile PATCH processing is one backend transaction spanning the relevant
Person, CommunityProfile, ProfessionalProfile and relationship changes.
Validation occurs before or within the authoritative mutation, and failed
audited updates roll back rather than leaving unintended partial canonical
state.

Member-originated changes use the existing append-only audit mechanism with
source:

```text
COMMUNITY_SELF_SERVICE
```

The authenticated User is the actor. Audit metadata identifies the source and
Person, but sensitive values are not unnecessarily written into the metadata.

Effective first- or last-name changes enqueue the existing asynchronous,
coalesced `PERSON_PROFILE` synchronization path. The approved mapping is:

- `first_name` → Brevo `FIRSTNAME`;
- `last_name` → Brevo `LASTNAME`;
- normalized mobile → Brevo `SMS`.

Community Profile V1 cannot edit mobile. Therefore:

- no-op name updates do not create unnecessary sync work;
- bio-only edits do not enqueue Person Profile sync;
- professional-only edits do not enqueue it;
- skills/interests-only edits do not enqueue it;
- marketing preferences remain independent and untouched;
- no synchronous Brevo call occurs during profile save.

## Save, cancel and failure behavior

The editor initializes from the authoritative profile and options requests.
Save is disabled while a save is in progress, preventing intentional double
submission. Failed saves retain the entered form state and show a safe error;
successful saves use the returned authoritative profile. Cancel navigates back
to My Profile without mutating the backend.

Review acknowledgement is explicitly sequenced after a successful save when
the member selected the acknowledgement checkbox. It is never represented as
successful if the acknowledgement request fails.

## Security and authorization

Profile access and mutation require:

- an authenticated session;
- current Community eligibility;
- backend derivation of the Person from the authenticated User;
- no arbitrary Person identifier or IDOR-style target;
- CSRF protection for unsafe requests;
- Django session/cookie authentication, not JWT.

Frontend route guards and form controls improve UX but are not security
boundaries. Backend authorization and validation remain authoritative.

## Validation checkpoint

The following behaviors were recorded as manually exercised during Profile V1
implementation:

- an existing CRM Person safely joining Community;
- the existing-record review banner;
- read-only My Profile rendering;
- Edit Profile save;
- canonical edits visible in Community and CRM;
- long-name responsive rendering;
- Skills and Interests editing;
- explicit Review Profile acknowledgement;
- acknowledgement persisting after refresh;
- Looks Good acknowledgement;
- Community name change followed by the background `PERSON_PROFILE` job and
  Brevo update.

At the latest hardening checkpoint, the automated baseline was:

- backend: 1,044 tests passed;
- Community frontend: 77 tests passed;
- Community production build: passed.

The Community GitHub frontend validation workflow runs:

```text
npm ci
npm run test:config
npm test -- --watch=false
npm run build
```

These are checkpoint figures, not a permanent test-count guarantee.

## Deferred Profile scope

The following are not part of Profile V1:

- Profile Photo and durable object storage;
- Directory and Directory Profile;
- directory visibility/privacy settings;
- stable public/community profile identifiers;
- QR profile sharing;
- connections and networking;
- email or mobile self-service editing;
- Account Settings.

Profile Photo may be investigated separately, but remains deferred here.

## Relationship to future Directory Profile

My Profile is the owner-facing composed profile. A future Directory Profile
will be a privacy-safe member-facing projection of selected data.

Both should ultimately derive from the same canonical data and
`CommunityProfile`; neither requires another duplicate identity/profile
database. This document does not define future Directory fields or privacy
defaults.
