"use client";

import { useEffect, useMemo, useState } from "react";

import type { AvailabilityResult, BookingService, BusinessHour } from "@/lib/booking/types";

import styles from "./BookingExperience.module.css";

type BookingExperienceProps = {
  businessHours: BusinessHour[];
  embedded?: boolean;
  services: BookingService[];
  timezone: string;
};

type AppointmentResponse = {
  appointmentId: string;
  end: string;
  serviceName: string;
  start: string;
  syncStatus: "confirmed" | "pending_sync";
  timezone: string;
};

function getTodayInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateForHumans(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BookingExperience({
  businessHours,
  embedded = false,
  services,
  timezone,
}: BookingExperienceProps) {
  const [selectedServiceSlug, setSelectedServiceSlug] = useState(services[0]?.slug ?? "");
  const [selectedDate, setSelectedDate] = useState(getTodayInTimezone(timezone));
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AppointmentResponse | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
  });

  const selectedService = useMemo(
    () => services.find((service) => service.slug === selectedServiceSlug) ?? services[0] ?? null,
    [selectedServiceSlug, services],
  );

  useEffect(() => {
    if (!selectedServiceSlug || !selectedDate) {
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      try {
        setIsLoadingAvailability(true);
        setAvailabilityError(null);
        setSelectedTime("");

        const response = await fetch(
          `/api/availability?date=${selectedDate}&service=${selectedServiceSlug}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as AvailabilityResult & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível carregar os horários.");
        }

        setAvailability(payload);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setAvailability(null);
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os horários.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAvailability(false);
        }
      }
    }

    void loadAvailability();

    return () => controller.abort();
  }, [selectedDate, selectedServiceSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedServiceSlug || !selectedDate || !selectedTime) {
      setFormError("Selecione serviço, data e horário antes de confirmar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setSuccess(null);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceSlug: selectedServiceSlug,
          date: selectedDate,
          time: selectedTime,
          ...form,
        }),
      });

      const payload = (await response.json()) as
        | AppointmentResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error ?? "Não foi possível confirmar o agendamento."
            : "Não foi possível confirmar o agendamento.",
        );
      }

      setSuccess(payload as AppointmentResponse);
      setSelectedTime("");
      setForm({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        notes: "",
      });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o agendamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      {!embedded ? (
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Agendamento direto no site</span>
          <h1 className={styles.title}>Escolha o serviço, o horário e confirme em poucos passos.</h1>
          <p className={styles.lead}>
            A agenda agora é nativa do site da Pedro Lucas Barbearia. O sistema cruza
            disponibilidade, bloqueios da agenda e o calendário operacional antes de liberar
            cada horário.
          </p>
        </section>
      ) : null}

      <div
        className={`${styles.layout} ${embedded ? styles.layoutEmbedded : ""}`.trim()}
      >
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Monte seu agendamento</h2>
          <p className={styles.panelLead}>
            Selecione o serviço, escolha a data e reserve um horário disponível em tempo real.
          </p>

          <form className={styles.formStack} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Serviço</label>
              <div className={styles.serviceGrid}>
                {services.map((service) => {
                  const isSelected = selectedServiceSlug === service.slug;

                  return (
                    <button
                      key={service.slug}
                      type="button"
                      className={`${styles.serviceButton} ${
                        isSelected ? styles.serviceButtonSelected : ""
                      }`.trim()}
                      onClick={() => setSelectedServiceSlug(service.slug)}
                    >
                      <div className={styles.serviceHeader}>
                        <span className={styles.serviceName}>{service.name}</span>
                        <span className={styles.serviceMeta}>
                          {service.priceLabel} · {service.durationMinutes} min
                        </span>
                      </div>
                      <p className={styles.serviceDescription}>{service.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="booking-date">
                Data
              </label>
              <input
                id="booking-date"
                className={styles.dateInput}
                type="date"
                min={getTodayInTimezone(timezone)}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              {selectedDate ? (
                <span className={styles.helper}>
                  {formatDateForHumans(selectedDate, timezone)}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Horários disponíveis</label>
              {isLoadingAvailability ? (
                <div className={styles.note}>Buscando horários disponíveis...</div>
              ) : null}
              {availabilityError ? (
                <div className={`${styles.note} ${styles.error}`}>{availabilityError}</div>
              ) : null}
              {!isLoadingAvailability && !availabilityError && availability?.slots.length ? (
                <div className={styles.slotsGrid}>
                  {availability.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`${styles.slotButton} ${
                        selectedTime === slot.time ? styles.slotButtonSelected : ""
                      }`.trim()}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {!isLoadingAvailability &&
              !availabilityError &&
              availability &&
              availability.slots.length === 0 ? (
                <div className={styles.note}>
                  Não há horários livres nesta data para o serviço escolhido. Tente outra data
                  ou outro serviço.
                </div>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-name">
                Nome completo
              </label>
              <input
                id="customer-name"
                className={styles.input}
                type="text"
                placeholder="Seu nome"
                value={form.customerName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerName: event.target.value }))
                }
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-phone">
                WhatsApp
              </label>
              <input
                id="customer-phone"
                className={styles.input}
                type="tel"
                placeholder="(84) 99999-9999"
                value={form.customerPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerPhone: event.target.value }))
                }
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-email">
                E-mail
              </label>
              <input
                id="customer-email"
                className={styles.input}
                type="email"
                placeholder="voce@exemplo.com"
                value={form.customerEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerEmail: event.target.value }))
                }
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-notes">
                Observações
              </label>
              <textarea
                id="customer-notes"
                className={styles.textarea}
                placeholder="Preferências, restrições ou qualquer observação útil para o atendimento."
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            {formError ? <div className={`${styles.note} ${styles.error}`}>{formError}</div> : null}

            {success ? (
              <div className={`${styles.note} ${styles.success}`}>
                <strong>Agendamento confirmado.</strong>
                <br />
                {success.serviceName} em {formatDateTime(success.start, success.timezone)}.
                {success.syncStatus === "pending_sync" ? (
                  <>
                    <br />
                    A reserva foi registrada, mas a sincronização com o Google Calendar ficou
                    pendente e precisa de revisão administrativa.
                  </>
                ) : null}
              </div>
            ) : null}

            <button className={styles.submit} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Confirmando agendamento..." : "Confirmar agendamento"}
            </button>
          </form>
        </section>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Resumo operacional</h2>
          <p className={styles.panelLead}>
            Esse fluxo já nasce preparado para agenda profissional, com disponibilidade em tempo
            real e sincronização com calendário.
          </p>

          <ul className={styles.infoList}>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>Serviço selecionado</span>
              <div className={styles.infoValue}>
                {selectedService ? (
                  <>
                    <strong>{selectedService.name}</strong>
                    <br />
                    {selectedService.priceLabel} · {selectedService.durationMinutes} min
                  </>
                ) : (
                  "Escolha um serviço para ver os detalhes."
                )}
              </div>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>Janela operacional</span>
              <div className={styles.infoValue}>
                Segunda a sábado, das 9h às 18h.
                <br />
                Domingo fechado.
              </div>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>Regras do slot</span>
              <div className={styles.infoValue}>
                Os horários disponíveis já consideram duração do serviço, buffers operacionais e
                bloqueios vindos da agenda.
              </div>
            </li>
          </ul>

          <div className={styles.note}>
            Se preferir, o cliente ainda pode chamar no WhatsApp. Mas a ideia desse fluxo é que a
            reserva já saia do site pronta para operação.
          </div>

          <div className={styles.panelTitle} style={{ marginTop: "24px" }}>
            Configuração atual
          </div>
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Timezone</span>
              <span className={styles.summaryValue}>{timezone}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Dias cadastrados</span>
              <span className={styles.summaryValue}>{businessHours.length}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Serviços no catálogo</span>
              <span className={styles.summaryValue}>{services.length}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
