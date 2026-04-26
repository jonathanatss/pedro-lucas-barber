import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOOGLE_CALENDAR_ID: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1).optional(),
  BOOKING_TIMEZONE: z.string().min(1).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const placeholderPatterns = [
  "SEU_",
  "SUA_",
  "COLE_AQUI",
  "SUA-",
  "SEU-",
  "SEU-DOMINIO",
  "SEU-PROJETO",
];

function readOptionalEnv(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (placeholderPatterns.some((pattern) => trimmedValue.includes(pattern))) {
    return undefined;
  }

  return trimmedValue;
}

function readOptionalSecret(value: string | undefined) {
  const optionalValue = readOptionalEnv(value);

  if (!optionalValue) {
    return undefined;
  }

  const unquotedValue = optionalValue.replace(/^['"]|['"]$/g, "");

  return unquotedValue.startsWith("\\$") ? `$${unquotedValue.slice(2)}` : unquotedValue;
}

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: readOptionalEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readOptionalEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: readOptionalSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
  GOOGLE_CALENDAR_ID: readOptionalEnv(process.env.GOOGLE_CALENDAR_ID),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: readOptionalEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: readOptionalSecret(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  ),
  BOOKING_TIMEZONE: readOptionalEnv(process.env.BOOKING_TIMEZONE),
  ASAAS_API_KEY: readOptionalSecret(process.env.ASAAS_API_KEY),
  ASAAS_ENVIRONMENT: readOptionalEnv(process.env.ASAAS_ENVIRONMENT),
  ASAAS_WEBHOOK_TOKEN: readOptionalSecret(process.env.ASAAS_WEBHOOK_TOKEN),
  NEXT_PUBLIC_SITE_URL: readOptionalEnv(process.env.NEXT_PUBLIC_SITE_URL),
});

export const bookingTimezone = env.BOOKING_TIMEZONE ?? "America/Sao_Paulo";

export const hasSupabaseBrowserCredentials = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const hasSupabaseServiceCredentials = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
);

export const hasGoogleCalendarCredentials = Boolean(
  env.GOOGLE_CALENDAR_ID &&
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
);

export const asaasEnvironment = env.ASAAS_ENVIRONMENT ?? "sandbox";

export const hasAsaasCredentials = Boolean(env.ASAAS_API_KEY);

export const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function getGooglePrivateKey() {
  return env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function getMissingSupabaseServiceCredentials() {
  return [
    ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
