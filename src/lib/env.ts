import 'server-only';

import { z } from 'zod';

/**
 * Server-only environment, validated once on first import so a missing or
 * malformed variable fails fast with a readable message instead of surfacing
 * as an obscure driver/SDK error deep inside a request.
 */
const schema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // Shared with rfc-web. The /api/v1 reseller models use `rs_*` collections so they never touch the store's data.
  MONGODB_DB: z.string().min(1).default('rfc_gadget'),
  // Optional test-database switch so local testing never touches production data.
  USE_TEST_DB: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  MONGODB_DB_TEST: z.string().min(1).default('rfc_gadget_test'),
  MONGODB_URI_TEST: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  // Realtime notifications (Pusher Channels). Optional: without them the
  // notification bell falls back to polling.
  PUSHER_APP_ID: z.string().min(1).optional(),
  PUSHER_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1).optional(),
  // System notifications (Web Push). Optional: without them only the in-page
  // bell is used. Generate with `npx web-push generate-vapid-keys`.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).default('mailto:support@rfcgadget.com'),
  // Outgoing email (password reset) over SMTP — a free Gmail account with an
  // App Password works. Optional: without them, dev logs the mail instead.
  SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  // Google OAuth (optional; enables "Continue with Google" on /login & /register).
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // 'log' prints emails instead of sending them (tests, local runs).
  MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('smtp'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid server environment variables:\n${issues}`);
}

const useTestDb = parsed.data.USE_TEST_DB || parsed.data.NODE_ENV === 'test';

export const serverEnv = {
  ...parsed.data,
  IS_PROD: parsed.data.NODE_ENV === 'production',
  IS_TEST_DB: useTestDb,
  ACTIVE_MONGODB_DB: useTestDb ? parsed.data.MONGODB_DB_TEST : parsed.data.MONGODB_DB,
  ACTIVE_MONGODB_URI: useTestDb
    ? (parsed.data.MONGODB_URI_TEST ?? parsed.data.MONGODB_URI)
    : parsed.data.MONGODB_URI,
} as const;
