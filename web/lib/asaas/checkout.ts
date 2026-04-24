import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AsaasApiError, asaasRequest } from "@/lib/asaas/client";
import { getAsaasCheckoutUrl, getCheckoutCallbackUrl } from "@/lib/asaas/config";
import { getMembershipPlanBySlug } from "@/lib/asaas/plans";
import type { AsaasCheckoutResponse, CreateCheckoutResult } from "@/lib/asaas/types";
import { bookingTimezone } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const checkoutInputSchema = z.object({
  customerCpfCnpj: z.string().trim().min(11).max(18).optional().or(z.literal("")),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerName: z.string().trim().min(3).max(120),
  customerPhone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
  planSlug: z.string().trim().min(2).max(120),
});

type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export class MembershipCheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

function getTodayInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(new Date());
}

function getCustomerData(input: CheckoutInput) {
  return {
    ...(input.customerCpfCnpj ? { cpfCnpj: input.customerCpfCnpj.replace(/\D/g, "") } : {}),
    ...(input.customerEmail ? { email: input.customerEmail } : {}),
    name: input.customerName,
    ...(input.customerPhone ? { phone: input.customerPhone.replace(/\D/g, "") } : {}),
  };
}

export async function createMembershipCheckout(rawInput: unknown): Promise<CreateCheckoutResult> {
  const input = checkoutInputSchema.parse(rawInput);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new MembershipCheckoutError(
      "As credenciais do Supabase ainda não foram configuradas.",
      503,
      "supabase_not_configured",
    );
  }

  const plan = await getMembershipPlanBySlug(input.planSlug);

  if (!plan) {
    throw new MembershipCheckoutError("Plano inválido ou indisponível.", 400, "invalid_plan");
  }

  const externalReference = randomUUID();
  const insertResult = await supabase
    .from("memberships")
    .insert({
      customer_cpf_cnpj: input.customerCpfCnpj || null,
      customer_email: input.customerEmail || null,
      customer_name: input.customerName,
      customer_phone: input.customerPhone || null,
      external_reference: externalReference,
      plan_cycle_snapshot: plan.cycle,
      plan_id: plan.id ?? null,
      plan_name_snapshot: plan.name,
      plan_price_cents_snapshot: plan.priceCents,
      plan_slug_snapshot: plan.slug,
      status: "checkout_created",
    })
    .select("id")
    .single();

  if (insertResult.error) {
    throw new MembershipCheckoutError(
      "Não foi possível preparar a assinatura agora.",
      500,
      "membership_insert_failed",
    );
  }

  try {
    const checkout = await asaasRequest<AsaasCheckoutResponse>("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"],
        callback: {
          cancelUrl: getCheckoutCallbackUrl("/clube?checkout=cancelado"),
          expiredUrl: getCheckoutCallbackUrl("/clube?checkout=expirado"),
          successUrl: getCheckoutCallbackUrl("/clube/sucesso"),
        },
        chargeTypes: ["RECURRENT"],
        externalReference,
        items: [
          {
            description: plan.description,
            name: plan.name,
            quantity: 1,
            value: plan.priceCents / 100,
          },
        ],
        customerData: getCustomerData(input),
        minutesToExpire: 120,
        subscription: {
          cycle: plan.cycle,
          nextDueDate: getTodayInTimezone(bookingTimezone),
        },
      },
    });

    const checkoutUrl = checkout.link ?? getAsaasCheckoutUrl(checkout.id);

    await supabase
      .from("memberships")
      .update({
        asaas_checkout_id: checkout.id,
        asaas_checkout_url: checkoutUrl,
        raw_checkout: checkout,
      })
      .eq("id", insertResult.data.id);

    return {
      checkoutId: checkout.id,
      checkoutUrl,
      externalReference,
      membershipId: insertResult.data.id,
    };
  } catch (error) {
    await supabase
      .from("memberships")
      .update({
        raw_checkout:
          error instanceof AsaasApiError
            ? { error: error.message, payload: error.payload, status: error.status }
            : { error: "unexpected_checkout_error" },
        status: "payment_failed",
      })
      .eq("id", insertResult.data.id);

    if (error instanceof AsaasApiError) {
      throw new MembershipCheckoutError(error.message, error.status, "asaas_checkout_failed");
    }

    throw new MembershipCheckoutError(
      "Não foi possível criar o checkout recorrente.",
      500,
      "asaas_checkout_failed",
    );
  }
}
