/*
# Seed Estúdio administrator

## What it does
Creates the sysadmin role used by the Estúdio access checks and links the
administrator account (bispacleo@gmail.com) to it, together with a profile.

## Security
- Only inserts rows; no policies or grants change.
- Idempotent: safe to re-run.
*/

INSERT INTO roles (key, name, description, level)
VALUES ('sysadmin', 'Administrador', 'Acesso total ao Estúdio', 100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, roles r
WHERE u.email = 'bispacleo@gmail.com' AND r.key = 'sysadmin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO profiles (auth_user_id, username, full_name, email, account_status)
SELECT u.id, 'bispacleo', 'Administrador', u.email, 'active'
FROM auth.users u
WHERE u.email = 'bispacleo@gmail.com'
ON CONFLICT (auth_user_id) DO NOTHING;
