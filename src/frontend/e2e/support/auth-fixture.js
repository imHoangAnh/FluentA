import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { expect } from '@playwright/test';

export const API_BASE_URL = process.env.E2E_API_URL ?? 'https://localhost:7000/api/v1';
export const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'fluenta-postgres';
export const FIXTURE_PASSWORD = 'SecurePass123';

// This hash is intentionally fixed for the local-only test-host identity.
// It is never used by the application runtime or production data.
const FIXTURE_PASSWORD_HASH = '$2a$11$AfUbk7ciTyXVa.LqUqpnB.xeVC3RW.0RfQ2fqIrKQ7J3zXLgYLJjO';
let fixtureJwtKey;

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function seedVerifiedUser({
  email = `e2e-${crypto.randomUUID()}@fluenta.local`,
  fullName = 'E2E Learner',
  password = FIXTURE_PASSWORD,
} = {}) {
  if (password !== FIXTURE_PASSWORD) {
    throw new Error(`The local auth fixture only supports ${FIXTURE_PASSWORD}.`);
  }

  const id = crypto.randomUUID();
  const sql = `
INSERT INTO users (
  id, email, full_name, bio, password_hash, email_verified_at,
  otp_failed_attempts, created_at, updated_at, deleted_at
)
VALUES (
  ${sqlLiteral(id)}::uuid, ${sqlLiteral(email)}, ${sqlLiteral(fullName)}, '',
  ${sqlLiteral(FIXTURE_PASSWORD_HASH)}, now(), 0, now(), now(), NULL
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  password_hash = EXCLUDED.password_hash,
  email_verified_at = EXCLUDED.email_verified_at,
  otp_code = NULL,
  otp_expires_at = NULL,
  otp_failed_attempts = 0,
  otp_resend_available_at = NULL,
  reset_password_token = NULL,
  reset_password_expires_at = NULL,
  deleted_at = NULL,
  updated_at = now()
RETURNING id;`;

  let persistedId = id;
  try {
    const output = execFileSync(
      'docker',
      ['exec', DB_CONTAINER, 'psql', '-U', 'fluenta', '-d', 'fluenta_dev', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { stdio: 'pipe', encoding: 'utf8' },
    );
    persistedId = output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] || id;
  } catch (error) {
    const detail = error?.stderr?.toString?.() || error?.message || 'unknown docker/psql error';
    throw new Error(`Unable to seed the local E2E user in ${DB_CONTAINER}: ${detail}`);
  }

  return { id: persistedId, email, fullName, password };
}

function getFixtureJwtKey() {
  if (fixtureJwtKey) return fixtureJwtKey;
  fixtureJwtKey = process.env.E2E_JWT_KEY;
  if (!fixtureJwtKey) {
    const project = path.resolve(process.cwd(), '../backend/FluentA.API/FluentA.API.csproj');
    const secrets = execFileSync('dotnet', ['user-secrets', 'list', '--project', project], { encoding: 'utf8' });
    fixtureJwtKey = secrets.match(/^Jwt:Key\s*=\s*(.+)$/m)?.[1]?.trim();
  }
  if (!fixtureJwtKey) {
    throw new Error('The local auth fixture requires E2E_JWT_KEY or the API user-secrets Jwt:Key.');
  }
  return fixtureJwtKey;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function createFixtureToken(identity) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: identity.id,
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': identity.id,
    email: identity.email,
    jti: crypto.randomUUID().replaceAll('-', ''),
    nbf: issuedAt,
    exp: issuedAt + 7 * 24 * 60 * 60,
    iss: 'FluentA',
    aud: 'FluentA.Web',
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', getFixtureJwtKey()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export async function loginSeededUser(page, options = {}) {
  const identity = seedVerifiedUser(options);
  const token = createFixtureToken(identity);

  await page.context().addCookies([{ name: 'access_token', value: token, url: 'https://localhost:5173/', httpOnly: true, secure: true, sameSite: 'Strict' }]);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

  return {
    ...identity,
    token,
    headers: { Cookie: `access_token=${token}` },
  };
}

export async function loginSeededApi(_request, options = {}) {
  const identity = seedVerifiedUser(options);
  const token = createFixtureToken(identity);

  return {
    ...identity,
    token,
    headers: { Cookie: `access_token=${token}` },
  };
}
