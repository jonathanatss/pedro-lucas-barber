"use client";

import { useMemo, useState } from "react";

import type { MembershipPlan } from "@/lib/asaas/types";
import { formatPriceCents } from "@/lib/asaas/plans";

import styles from "./MembershipCheckout.module.css";

type MembershipCheckoutProps = {
  plans: MembershipPlan[];
};

type CheckoutResponse = {
  checkoutUrl: string;
};

export default function MembershipCheckout({ plans }: MembershipCheckoutProps) {
  const [selectedPlanSlug, setSelectedPlanSlug] = useState(plans[0]?.slug ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerCpfCnpj: "",
    customerEmail: "",
    customerName: "",
    customerPhone: "",
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.slug === selectedPlanSlug) ?? plans[0] ?? null,
    [plans, selectedPlanSlug],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlan) {
      setError("Selecione um plano para continuar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/asaas/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          planSlug: selectedPlan.slug,
        }),
      });

      const payload = (await response.json()) as CheckoutResponse | { error?: string };

      if (!response.ok || !("checkoutUrl" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error ?? "Não foi possível iniciar a assinatura."
            : "Não foi possível iniciar a assinatura.",
        );
      }

      window.location.assign(payload.checkoutUrl);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível iniciar a assinatura.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.planColumn} aria-label="Planos mensais">
        {plans.map((plan) => {
          const isSelected = selectedPlanSlug === plan.slug;

          return (
            <button
              className={`${styles.planButton} ${isSelected ? styles.planButtonActive : ""}`.trim()}
              key={plan.slug}
              onClick={() => setSelectedPlanSlug(plan.slug)}
              type="button"
            >
              <span className={styles.planName}>{plan.name}</span>
              <span className={styles.planPrice}>{formatPriceCents(plan.priceCents)}/mês</span>
              <span className={styles.planDescription}>{plan.description}</span>
              <span className={styles.benefits}>
                {plan.benefits.map((benefit) => (
                  <span className={styles.benefit} key={benefit}>
                    {benefit}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.formPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.eyebrow}>Clube mensal</span>
          <h1>Assinatura recorrente da barbearia</h1>
          <p>
            Preencha seus dados e finalize o cartão no checkout seguro do Asaas.
          </p>
        </div>

        {selectedPlan ? (
          <div className={styles.summary}>
            <span>{selectedPlan.name}</span>
            <strong>{formatPriceCents(selectedPlan.priceCents)}/mês</strong>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Nome completo</span>
            <input
              autoComplete="name"
              onChange={(event) =>
                setForm((current) => ({ ...current, customerName: event.target.value }))
              }
              placeholder="Seu nome"
              required
              type="text"
              value={form.customerName}
            />
          </label>

          <label className={styles.field}>
            <span>E-mail</span>
            <input
              autoComplete="email"
              onChange={(event) =>
                setForm((current) => ({ ...current, customerEmail: event.target.value }))
              }
              placeholder="voce@exemplo.com"
              type="email"
              value={form.customerEmail}
            />
          </label>

          <label className={styles.field}>
            <span>WhatsApp</span>
            <input
              autoComplete="tel"
              onChange={(event) =>
                setForm((current) => ({ ...current, customerPhone: event.target.value }))
              }
              placeholder="(84) 99999-9999"
              type="tel"
              value={form.customerPhone}
            />
          </label>

          <label className={styles.field}>
            <span>CPF</span>
            <input
              autoComplete="off"
              inputMode="numeric"
              onChange={(event) =>
                setForm((current) => ({ ...current, customerCpfCnpj: event.target.value }))
              }
              placeholder="000.000.000-00"
              type="text"
              value={form.customerCpfCnpj}
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.submit} disabled={isSubmitting} type="submit">
            {isSubmitting ? "Abrindo checkout..." : "Assinar com cartão"}
          </button>
        </form>
      </section>
    </div>
  );
}
