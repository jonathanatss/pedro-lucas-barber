import { getAsaasWebhookToken } from "@/lib/asaas/config";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type JsonObject = Record<string, unknown>;
type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export class AsaasWebhookError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(source: JsonObject | undefined, key: string) {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function parseAsaasDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const brazilianDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (brazilianDate) {
    const [, day, month, year] = brazilianDate;
    return `${year}-${month}-${day}`;
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  return null;
}

function getCheckoutStatus(eventType: string) {
  if (eventType === "CHECKOUT_PAID") {
    return "checkout_paid";
  }

  if (eventType === "CHECKOUT_EXPIRED") {
    return "expired";
  }

  if (eventType === "CHECKOUT_CANCELED") {
    return "canceled";
  }

  return "checkout_created";
}

function getSubscriptionStatus(eventType: string, subscription: JsonObject) {
  const status = getString(subscription, "status");

  if (eventType === "SUBSCRIPTION_DELETED") {
    return "deleted";
  }

  if (eventType === "SUBSCRIPTION_INACTIVATED") {
    return "canceled";
  }

  if (status === "ACTIVE" || eventType === "SUBSCRIPTION_CREATED") {
    return "active";
  }

  return "checkout_paid";
}

function getPaymentStatus(eventType: string) {
  if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
    return "active";
  }

  if (eventType === "PAYMENT_OVERDUE") {
    return "past_due";
  }

  if (
    eventType === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED" ||
    eventType === "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  ) {
    return "payment_failed";
  }

  if (eventType === "PAYMENT_DELETED" || eventType === "PAYMENT_REFUNDED") {
    return "canceled";
  }

  return null;
}

async function findMembershipId(
  supabase: SupabaseAdmin,
  column: string,
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const result = await supabase
    .from("memberships")
    .select("id")
    .eq(column, value)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return null;
  }

  return typeof result.data?.id === "string" ? result.data.id : null;
}

async function updateMembership(
  supabase: SupabaseAdmin,
  membershipId: string | null,
  update: JsonObject,
) {
  if (!membershipId) {
    return false;
  }

  const result = await supabase
    .from("memberships")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  return !result.error;
}

async function findByAnyReference(
  supabase: SupabaseAdmin,
  references: Array<[string, string | null]>,
) {
  for (const [column, value] of references) {
    const membershipId = await findMembershipId(supabase, column, value);

    if (membershipId) {
      return membershipId;
    }
  }

  return null;
}

async function applyCheckoutEvent(
  supabase: SupabaseAdmin,
  eventType: string,
  checkout: JsonObject,
) {
  const checkoutId = getString(checkout, "id");
  const membershipId = await findByAnyReference(supabase, [
    ["external_reference", getString(checkout, "externalReference")],
    ["asaas_checkout_id", checkoutId],
    ["asaas_customer_id", getString(checkout, "customer")],
  ]);

  return updateMembership(supabase, membershipId, {
    asaas_checkout_id: checkoutId,
    asaas_customer_id: getString(checkout, "customer"),
    raw_checkout: checkout,
    status: getCheckoutStatus(eventType),
  });
}

async function applySubscriptionEvent(
  supabase: SupabaseAdmin,
  eventType: string,
  subscription: JsonObject,
) {
  const subscriptionId = getString(subscription, "id");
  const customerId = getString(subscription, "customer");
  const membershipId = await findByAnyReference(supabase, [
    ["asaas_subscription_id", subscriptionId],
    ["external_reference", getString(subscription, "externalReference")],
    ["asaas_customer_id", customerId],
  ]);

  return updateMembership(supabase, membershipId, {
    asaas_customer_id: customerId,
    asaas_subscription_id: subscriptionId,
    next_due_date: parseAsaasDate(subscription.nextDueDate),
    raw_subscription: subscription,
    status: getSubscriptionStatus(eventType, subscription),
  });
}

async function applyPaymentEvent(
  supabase: SupabaseAdmin,
  eventType: string,
  payment: JsonObject,
) {
  const status = getPaymentStatus(eventType);
  const membershipId = await findByAnyReference(supabase, [
    ["asaas_subscription_id", getString(payment, "subscription")],
    ["external_reference", getString(payment, "externalReference")],
    ["asaas_customer_id", getString(payment, "customer")],
  ]);

  return updateMembership(supabase, membershipId, {
    ...(status ? { status } : {}),
    last_payment_id: getString(payment, "id"),
    last_payment_status: getString(payment, "status"),
    raw_payment: payment,
  });
}

async function markWebhookProcessed(
  supabase: SupabaseAdmin,
  eventId: string,
  processingError?: string,
) {
  await supabase
    .from("asaas_webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: processingError ?? null,
    })
    .eq("asaas_event_id", eventId);
}

export function validateAsaasWebhookToken(headers: Headers) {
  const expectedToken = getAsaasWebhookToken();

  if (!expectedToken) {
    throw new AsaasWebhookError(
      "O token do webhook do Asaas ainda não foi configurado.",
      503,
      "asaas_webhook_token_not_configured",
    );
  }

  if (headers.get("asaas-access-token") !== expectedToken) {
    throw new AsaasWebhookError("Webhook não autorizado.", 401, "invalid_webhook_token");
  }
}

export async function processAsaasWebhook(payload: AsaasWebhookPayload) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new AsaasWebhookError(
      "As credenciais do Supabase ainda não foram configuradas.",
      503,
      "supabase_not_configured",
    );
  }

  const eventType = typeof payload.event === "string" ? payload.event : "UNKNOWN";
  const eventId =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id
      : `${eventType}:${Date.now()}:${Math.random()}`;

  const insertResult = await supabase.from("asaas_webhook_events").insert({
    asaas_event_id: eventId,
    event_type: eventType,
    payload,
  });

  if (insertResult.error?.code === "23505") {
    return { duplicate: true, eventId, eventType, processed: true };
  }

  if (insertResult.error) {
    throw new AsaasWebhookError(
      "Não foi possível registrar o webhook do Asaas.",
      500,
      "webhook_insert_failed",
    );
  }

  let applied = false;

  if (isObject(payload.checkout)) {
    applied = (await applyCheckoutEvent(supabase, eventType, payload.checkout)) || applied;
  }

  if (isObject(payload.subscription)) {
    applied =
      (await applySubscriptionEvent(supabase, eventType, payload.subscription)) || applied;
  }

  if (isObject(payload.payment)) {
    applied = (await applyPaymentEvent(supabase, eventType, payload.payment)) || applied;
  }

  await markWebhookProcessed(supabase, eventId, applied ? undefined : "membership_not_found");

  return {
    duplicate: false,
    eventId,
    eventType,
    processed: true,
  };
}
