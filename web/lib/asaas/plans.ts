import { getSupabaseAdmin } from "@/lib/supabase-admin";

import type { MembershipPlan } from "./types";

export const fallbackMembershipPlans: MembershipPlan[] = [
  {
    active: true,
    benefits: ["1 corte por mês", "Agendamento online", "Prioridade em encaixes"],
    cycle: "MONTHLY",
    description:
      "Um corte por mês com agendamento online e benefício exclusivo para cliente recorrente.",
    name: "Corte Mensal",
    priceCents: 6990,
    slug: "corte-mensal",
    sortOrder: 1,
  },
  {
    active: true,
    benefits: ["1 barba por mês", "Produtos profissionais", "Agendamento online"],
    cycle: "MONTHLY",
    description: "Manutenção mensal da barba com cobrança automática no cartão.",
    name: "Barba Mensal",
    priceCents: 5990,
    slug: "barba-mensal",
    sortOrder: 2,
  },
  {
    active: true,
    benefits: ["1 combo corte + barba por mês", "Prioridade na agenda", "Atendimento completo"],
    cycle: "MONTHLY",
    description: "Plano mensal para manter corte e barba em dia com experiência completa.",
    name: "Clube Completo",
    priceCents: 9990,
    slug: "combo-clube",
    sortOrder: 3,
  },
];

type SubscriptionPlanRow = {
  active: boolean;
  benefits: string[] | null;
  cycle: "MONTHLY";
  description: string;
  id: string;
  name: string;
  price_cents: number;
  slug: string;
  sort_order: number;
};

function mapPlan(row: SubscriptionPlanRow): MembershipPlan {
  return {
    active: row.active,
    benefits: row.benefits ?? [],
    cycle: row.cycle,
    description: row.description,
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    slug: row.slug,
    sortOrder: row.sort_order,
  };
}

export async function getMembershipPlans() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return fallbackMembershipPlans;
  }

  const result = await supabase
    .from("subscription_plans")
    .select("id, slug, name, description, price_cents, cycle, benefits, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (result.error || !result.data?.length) {
    return fallbackMembershipPlans;
  }

  return (result.data as SubscriptionPlanRow[]).map(mapPlan);
}

export async function getMembershipPlanBySlug(slug: string) {
  const plans = await getMembershipPlans();
  return plans.find((plan) => plan.slug === slug) ?? null;
}

export function formatPriceCents(priceCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(priceCents / 100);
}
