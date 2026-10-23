-- Beacon schema + seed data.
-- Executed by the one-shot `seed` Compose service with psql.
--
-- The first statement creates Keycloak's database. Keycloak depends on this
-- service completing, so it always starts against a ready schema.
--
-- Re-running is safe: tables use IF NOT EXISTS and rows use ON CONFLICT.

SELECT 'CREATE DATABASE keycloak OWNER beacon'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  oidc_subject TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  bio TEXT,
  avatar_url TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public',
  attachment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id);
CREATE INDEX IF NOT EXISTS idx_attachments_stored_name ON attachments(stored_name);

-- Demo identities. The oidc_subject values match the fixed user IDs in
-- keycloak/realm.json, so the first SSO login links to these rows.
INSERT INTO users (id, oidc_subject, username, email, display_name, role, bio, avatar_url, preferences)
VALUES
  (1, '11111111-1111-4111-8111-111111111111', 'admin', 'admin@beacon.test', 'Avery Admin', 'admin',
   'Platform owner. Keeps the lights on and the backups honest.', NULL,
   '{"digest":"daily","theme":"paper"}'::jsonb),
  (2, '22222222-2222-4222-8222-222222222222', 'alice', 'alice@beacon.test', 'Alice Nguyen', 'member',
   'Backend engineer. Postgres apologist. Writes checklists for fun.', NULL,
   '{"digest":"weekly","theme":"paper"}'::jsonb),
  (3, '33333333-3333-4333-8333-333333333333', 'bob', 'bob@beacon.test', 'Bob Martinez', 'member',
   'SRE by day, homelab gremlin by night.', NULL,
   '{"digest":"daily","theme":"ink"}'::jsonb),
  (4, '44444444-4444-4444-8444-444444444444', 'carol', 'carol@beacon.test', 'Carol Okafor', 'member',
   'Design systems, self-hosting, and very sharp pencils.', NULL,
   '{"digest":"off","theme":"paper"}'::jsonb),
  (5, '55555555-5555-4555-8555-555555555555', 'dave', 'dave@beacon.test', 'Dave Kim', 'member',
   'Terminal shortcuts are a personality. Ask me about tmux.', NULL,
   '{"digest":"weekly","theme":"ink"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notes (id, user_id, title, body, visibility, attachment, created_at)
VALUES
  (1, 2, 'A tiny checklist for shipping on Fridays',
   '<p>We ship every Friday. Not because it is brave &mdash; because the checklist is boring and repeatable.</p><ul><li>Freeze schema changes Thursday at noon.</li><li>Run the smoke script against staging.</li><li>Name a rollback owner before the deploy window.</li><li>Post the release note in #beacon-ship.</li></ul><p>What did we miss? Add it in the comments.</p>',
   'public', NULL, now() - interval '9 days'),
  (2, 3, 'Debugging a flaky Postgres connection',
   '<p>The connection pool was fine. The DNS resolver was not.</p><p>We watched <code>pg_stat_activity</code> for a day and found nothing. The fix was a shorter <code>idleTimeoutMillis</code> and a health check that actually opens a socket.</p><pre>pool.on(''error'', err =&gt; log.error({ err }, ''idle client error''));</pre><p>Boring wins again.</p>',
   'public', NULL, now() - interval '7 days'),
  (3, 4, 'Self-hosting a photo library in 2026',
   '<p>Three disks, one tiny PC, and a rule: if restoring is hard, it is not a backup.</p><p>I keep originals on the NAS, thumbnails on SSD, and a weekly encrypted copy off-site. The import script is 80 lines of Python and has outlived two cloud subscriptions.</p>',
   'public', NULL, now() - interval '6 days'),
  (4, 5, 'My favorite terminal aliases',
   '<p>Nothing revolutionary, just the ones I actually use:</p><pre>alias gs="git status --short --branch"
alias ll="ls -lah"
alias ports="lsof -iTCP -sTCP:LISTEN -P -n"
alias k="kubectl"</pre><p>The <code>ports</code> alias has saved me from so many mystery processes.</p>',
   'public', NULL, now() - interval '5 days'),
  (5, 2, 'Homelab VLAN notes (the short version)',
   '<p>Management on VLAN 10, trusted devices on 20, IoT on 30, and a \"new stuff\" VLAN that I promise to clean up someday.</p><p>Firewall defaults: deny all, then allow the handful of flows that make the house work. The printer is still on its own island.</p>',
   'public', NULL, now() - interval '4 days'),
  (6, 1, 'Welcome to Beacon',
   '<p>Beacon is a small place for field notes: what you built, what broke, and what you would do differently next time.</p><p>Be kind, cite your sources, and do not paste production secrets into a note. (The lab may disagree with that last one.)</p>',
   'public', NULL, now() - interval '12 days'),
  (7, 3, 'Draft: incident postmortem for the queue outage',
   '<p><strong>Private draft.</strong> Timeline, customer impact, and the three follow-ups. Not ready to share yet.</p><p>The short version: a retry storm met a saturated connection pool. We need jitter, a circuit breaker, and dashboards that page the right person.</p>',
   'private', NULL, now() - interval '3 days'),
  (8, 1, 'Production handoff - internal only',
   '<p><strong>Private.</strong> This note should only be visible to the platform owner.</p><p>Internal API credential is stored in the <code>api_keys</code> table under <code>internal-api</code>. Rotate it after the next deploy.</p><p><code>FLAG{1d0r_private_n0te}</code></p>',
   'private', NULL, now() - interval '2 days'),
  (9, 4, 'Personal reading list',
   '<p>Private shelf: database internals, typography, and one very long book about bread.</p><p>No conclusions yet. Mostly margin notes.</p>',
   'private', NULL, now() - interval '1 day'),
  (10, 2, 'Shared: Beacon architecture diagram',
   '<p>Current shape of the lab: Next.js app, Postgres, and Keycloak. The diagram is in the shared library and the download link is below.</p><p>If you are testing the app, start with the obvious seams: search, notes, uploads, and the admin console.</p>',
   'public', 'welcome.txt', now() - interval '8 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO comments (id, note_id, user_id, body, created_at)
VALUES
  (1, 1, 3, '<p>Adding &quot;rollback owner&quot; to our checklist. The number of times nobody knows who owns the undo button is too high.</p>', now() - interval '8 days'),
  (2, 1, 4, '<p>We also freeze feature flags on Friday morning. <em>So</em> much calmer.</p>', now() - interval '8 days'),
  (3, 2, 5, '<p>The <code>ports</code> alias from my note would have found this in five minutes. Ask me how I know.</p>', now() - interval '6 days'),
  (4, 2, 2, '<p>Short idle timeouts plus a real socket check is the combo. Glad it was DNS and not something worse.</p>', now() - interval '6 days'),
  (5, 3, 2, '<p>&quot;If restoring is hard, it is not a backup&quot; is going on a sticky note.</p>', now() - interval '5 days'),
  (6, 4, 3, '<p>Stealing <code>ports</code>. My current workflow is &quot;run it and hope&quot;.</p>', now() - interval '4 days'),
  (7, 5, 5, '<p>The printer island is the most realistic part of this post.</p>', now() - interval '3 days'),
  (8, 6, 4, '<p>Hello from the design corner. Looking forward to the field notes.</p>', now() - interval '11 days'),
  (9, 10, 3, '<p>The diagram link works. Also, the download endpoint looks like it trusts the filename a little too much.</p>', now() - interval '6 hours'),
  (10, 10, 5, '<p>Good write-up. I am going to poke at the admin console next.</p>', now() - interval '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attachments (id, user_id, original_name, stored_name, mime_type, size_bytes, created_at)
VALUES
  (1, 2, 'welcome.txt', 'welcome.txt', 'text/plain', 356, now() - interval '8 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_keys (id, owner_id, name, token, created_at)
VALUES
  (1, 1, 'internal-api', 'sk_live_BEACON_TESTBED_7f4c1a9e2b', now() - interval '30 days'),
  (2, 1, 'keycloak-admin', 'kc-admin-BEACON-TESTBED-9d2e6f', now() - interval '30 days'),
  (3, 2, 'personal-export', 'pk_BEACON_ALICE_3a8c5d', now() - interval '12 days')
ON CONFLICT (id) DO NOTHING;

-- Keep sequences ahead of the explicit seed IDs so new rows do not collide.
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('notes', 'id'), (SELECT MAX(id) FROM notes));
SELECT setval(pg_get_serial_sequence('comments', 'id'), (SELECT MAX(id) FROM comments));
SELECT setval(pg_get_serial_sequence('attachments', 'id'), (SELECT MAX(id) FROM attachments));
SELECT setval(pg_get_serial_sequence('api_keys', 'id'), (SELECT MAX(id) FROM api_keys));

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users) = 0 OR (SELECT COUNT(*) FROM notes) = 0 THEN
    RAISE EXCEPTION 'Beacon seed verification failed';
  END IF;
END $$;
