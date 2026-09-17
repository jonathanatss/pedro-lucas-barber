"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AvailabilityResult,
  BookingService,
  BusinessBreak,
  BusinessHour,
} from "@/lib/booking/types";

import { siteContent } from "@/content/site";
import {
  areRequiredCustomerFieldsValid,
  getBookingCustomerErrors,
  type BookingCustomerErrors,
  type BookingCustomerField,
} from "@/lib/booking/customer-validation";

import styles from "./BookingExperience.module.css";

type BookingExperienceProps = {
  businessBreaks: BusinessBreak[];
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

type BookingFormState = {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  notes: string;
};

type AppointmentErrorResponse = {
  code?: string;
  error?: string;
  details?: { fieldErrors?: Partial<Record<BookingCustomerField, string[]>> };
};

const customerInputIds: Record<BookingCustomerField, string> = {
  customerName: "customer-name",
  customerPhone: "customer-phone",
  customerEmail: "customer-email",
};

function focusFirstCustomerError(errors: BookingCustomerErrors) {
  const field = (Object.keys(customerInputIds) as BookingCustomerField[])
    .find((key) => errors[key]);
  if (field) {
    document.getElementById(customerInputIds[field])?.focus();
  }
}

type QuickDateOption = {
  date: string;
  label: string;
  meta: string;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

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

function formatShortDateForHumans(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function addDaysToIsoDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return date.toISOString().slice(0, 10);
}

function getWeekdayFromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function getInitialBookingDate(timezone: string, businessHours: BusinessHour[]) {
  const today = getTodayInTimezone(timezone);

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = addDaysToIsoDate(today, offset);
    const weekday = getWeekdayFromIsoDate(candidate);
    const businessHour = businessHours.find((item) => item.weekday === weekday);

    if (businessHour && !businessHour.isClosed) {
      return candidate;
    }
  }

  return today;
}

function buildQuickDateOptions(
  timezone: string,
  businessHours: BusinessHour[],
  businessBreaks: BusinessBreak[],
): QuickDateOption[] {
  const today = getTodayInTimezone(timezone);
  const options: QuickDateOption[] = [];

  for (let offset = 0; offset <= 14 && options.length < 7; offset += 1) {
    const candidate = addDaysToIsoDate(today, offset);
    const weekday = getWeekdayFromIsoDate(candidate);
    const businessHour = businessHours.find((item) => item.weekday === weekday);

    if (!businessHour || businessHour.isClosed) {
      continue;
    }

    options.push({
      date: candidate,
      label: offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : formatShortDateForHumans(candidate, timezone),
      meta: formatBusinessWindowLabel(businessHour, businessBreaks),
    });
  }

  return options;
}

function formatBusinessWindowLabel(
  businessHour: BusinessHour,
  businessBreaks: BusinessBreak[],
) {
  if (businessHour.isClosed) {
    return "Fechado";
  }

  const windows = businessBreaks
    .filter(
      (businessBreak) =>
        timeToMinutes(businessBreak.startsAt) > timeToMinutes(businessHour.opensAt) &&
        timeToMinutes(businessBreak.endsAt) < timeToMinutes(businessHour.closesAt),
    )
    .reduce(
      (currentWindows, businessBreak) =>
        currentWindows.flatMap((window) => {
          if (
            timeToMinutes(businessBreak.endsAt) <= timeToMinutes(window.startsAt) ||
            timeToMinutes(businessBreak.startsAt) >= timeToMinutes(window.endsAt)
          ) {
            return [window];
          }

          return [
            { startsAt: window.startsAt, endsAt: businessBreak.startsAt },
            { startsAt: businessBreak.endsAt, endsAt: window.endsAt },
          ].filter((item) => timeToMinutes(item.startsAt) < timeToMinutes(item.endsAt));
        }),
      [{ startsAt: businessHour.opensAt, endsAt: businessHour.closesAt }],
    );

  return windows.map((window) => `${window.startsAt} às ${window.endsAt}`).join(" · ");
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

function buildManualBookingWhatsAppHref({
  date,
  form,
  service,
  time,
  timezone,
}: {
  date: string;
  form: BookingFormState;
  service: BookingService;
  time: string;
  timezone: string;
}) {
  const dateLabel = formatDateForHumans(date, timezone);
  const message = [
    `Olá! Tentei agendar pelo site da ${siteContent.businessName}, mas não consegui obter a confirmação.`,
    "",
    "Pode verificar se a reserva foi registrada e confirmar esse horário para mim?",
    `Nome: ${form.customerName || "Não informado"}`,
    `WhatsApp: ${form.customerPhone || "Não informado"}`,
    form.customerEmail ? `E-mail: ${form.customerEmail}` : null,
    `Serviço: ${service.name}`,
    `Data: ${dateLabel}`,
    `Horário: ${time}`,
    form.notes ? `Observações: ${form.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${siteContent.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function BookingExperience({
  businessBreaks,
  businessHours,
  embedded = false,
  services,
  timezone,
}: BookingExperienceProps) {
  const [selectedServiceSlug, setSelectedServiceSlug] = useState(services[0]?.slug ?? "");
  const [selectedDate, setSelectedDate] = useState(() =>
    getInitialBookingDate(timezone, businessHours),
  );
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [canUseManualFallback, setCanUseManualFallback] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<BookingCustomerField, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<BookingCustomerErrors>({});
  const [success, setSuccess] = useState<AppointmentResponse | null>(null);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [form, setForm] = useState<BookingFormState>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
  });

  const requiredFieldsValid = areRequiredCustomerFieldsValid(form);
  const customerErrors = getBookingCustomerErrors(form);
  const visibleCustomerErrors: BookingCustomerErrors = {};
  for (const field of Object.keys(customerInputIds) as BookingCustomerField[]) {
    visibleCustomerErrors[field] = serverFieldErrors[field] ??
      (touchedFields[field] ? customerErrors[field] : undefined);
  }

  function updateCustomerField(field: BookingCustomerField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setServerFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    setCanUseManualFallback(false);
  }

  function markCustomerFieldTouched(field: BookingCustomerField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  const selectedService = useMemo(
    () => services.find((service) => service.slug === selectedServiceSlug) ?? services[0] ?? null,
    [selectedServiceSlug, services],
  );

  const quickDateOptions = useMemo(
    () => buildQuickDateOptions(timezone, businessHours, businessBreaks),
    [businessBreaks, businessHours, timezone],
  );

  const manualFallbackHref = useMemo(() => {
    if (!canUseManualFallback || !formError || !requiredFieldsValid ||
      !selectedService || !selectedDate || !selectedTime) {
      return null;
    }

    return buildManualBookingWhatsAppHref({
      date: selectedDate,
      form,
      service: selectedService,
      time: selectedTime,
      timezone,
    });
  }, [canUseManualFallback, form, formError, requiredFieldsValid, selectedDate, selectedService, selectedTime, timezone]);

  useEffect(() => {
    if (!selectedServiceSlug || !selectedDate) {
      return;
    }

    const controller = new AbortController();
    let loading = false;

    async function loadAvailability(showLoading = false) {
      if (loading || controller.signal.aborted) {
        return;
      }

      loading = true;

      try {
        if (showLoading) {
          setIsLoadingAvailability(true);
          setSelectedTime("");
        }
        setAvailabilityError(null);

        const response = await fetch(
          `/api/availability?date=${selectedDate}&service=${selectedServiceSlug}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as AvailabilityResult & { error?: string };

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível carregar os horários.");
        }

        setAvailability(payload);
        setSelectedTime((current) =>
          payload.slots.some((slot) => slot.time === current) ? current : "",
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setAvailability(null);
        setSelectedTime("");
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os horários.",
        );
      } finally {
        loading = false;
        if (!controller.signal.aborted) {
          setIsLoadingAvailability(false);
        }
      }
    }

    void loadAvailability(true);
    const interval = window.setInterval(() => void loadAvailability(), 30_000);
    const refreshOnFocus = () => void loadAvailability();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [availabilityVersion, selectedDate, selectedServiceSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }
    setCanUseManualFallback(false);
    setServerFieldErrors({});
    setTouchedFields({ customerName: true, customerPhone: true, customerEmail: true });
    const validationErrors = getBookingCustomerErrors(form);
    if (Object.keys(validationErrors).length) {
      setFormError("Revise os campos indicados antes de confirmar.");
      focusFirstCustomerError(validationErrors);
      return;
    }

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
        | AppointmentErrorResponse;

      if (!response.ok) {
        const failure = payload as AppointmentErrorResponse;
        if (response.status === 400 && failure.details?.fieldErrors) {
          const errors: BookingCustomerErrors = {};
          for (const field of Object.keys(customerInputIds) as BookingCustomerField[]) {
            const message = failure.details.fieldErrors[field]?.[0];
            if (message) {
              errors[field] = message;
            }
          }
          setServerFieldErrors(errors);
          focusFirstCustomerError(errors);
        }
        if ("code" in payload && payload.code?.startsWith("slot_")) {
          setAvailabilityVersion((current) => current + 1);
        }

        setCanUseManualFallback(response.status >= 500);
        setFormError(
          "error" in payload
            ? payload.error ?? "Não foi possível confirmar o agendamento."
            : "Não foi possível confirmar o agendamento.",
        );
        return;
      }

      setSuccess(payload as AppointmentResponse);
      setAvailabilityVersion((current) => current + 1);
      setSelectedTime("");
      setTouchedFields({});
      setServerFieldErrors({});
      setForm({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        notes: "",
      });
    } catch {
      setCanUseManualFallback(true);
      setFormError("Não foi possível obter a confirmação. Antes de repetir, consulte o barbeiro pelo WhatsApp para verificar se a reserva foi registrada.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <section className={styles.panel}>
          {embedded ? (
            <h2 className={styles.panelTitle}>Agende seu horário</h2>
          ) : (
            <h1 className={styles.panelTitle}>Agende seu horário</h1>
          )}
          <p className={styles.panelLead}>
            Escolha o serviço, a data e o horário.
          </p>
          <p className={styles.helper}>Nome completo e WhatsApp são campos obrigatórios.</p>

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
              {quickDateOptions.length ? (
                <div className={styles.quickDateGrid} aria-label="Datas rápidas">
                  {quickDateOptions.map((option) => {
                    const isSelected = selectedDate === option.date;

                    return (
                      <button
                        key={option.date}
                        type="button"
                        className={`${styles.quickDateButton} ${
                          isSelected ? styles.quickDateButtonSelected : ""
                        }`.trim()}
                        onClick={() => setSelectedDate(option.date)}
                      >
                        <span>{option.label}</span>
                        <small>{option.meta}</small>
                      </button>
                    );
                  })}
                </div>
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
                Nome completo (obrigatório)
              </label>
              <input
                id="customer-name"
                className={styles.input}
                type="text"
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                aria-invalid={Boolean(visibleCustomerErrors.customerName)}
                aria-describedby={visibleCustomerErrors.customerName ? "customer-name-error" : undefined}
                placeholder="Seu nome"
                value={form.customerName}
                onChange={(event) => updateCustomerField("customerName", event.target.value)}
                onBlur={() => markCustomerFieldTouched("customerName")}
              />
              {visibleCustomerErrors.customerName ? (
                <span id="customer-name-error" className={styles.fieldError} role="alert">
                  {visibleCustomerErrors.customerName}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-phone">
                WhatsApp com DDD (obrigatório)
              </label>
              <input
                id="customer-phone"
                className={styles.input}
                type="tel"
                required
                maxLength={30}
                autoComplete="tel"
                aria-invalid={Boolean(visibleCustomerErrors.customerPhone)}
                aria-describedby={`customer-phone-hint${visibleCustomerErrors.customerPhone ? " customer-phone-error" : ""}`}
                placeholder="(84) 99999-9999"
                value={form.customerPhone}
                onChange={(event) => updateCustomerField("customerPhone", event.target.value)}
                onBlur={() => markCustomerFieldTouched("customerPhone")}
              />
              <span id="customer-phone-hint" className={styles.helper}>
                Informe o número com DDD. Exemplo: (84) 99999-9999.
              </span>
              {visibleCustomerErrors.customerPhone ? (
                <span id="customer-phone-error" className={styles.fieldError} role="alert">
                  {visibleCustomerErrors.customerPhone}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-email">
                E-mail (opcional)
              </label>
              <input
                id="customer-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(visibleCustomerErrors.customerEmail)}
                aria-describedby={visibleCustomerErrors.customerEmail ? "customer-email-error" : undefined}
                placeholder="voce@exemplo.com"
                value={form.customerEmail}
                onChange={(event) => updateCustomerField("customerEmail", event.target.value)}
                onBlur={() => markCustomerFieldTouched("customerEmail")}
              />
              {visibleCustomerErrors.customerEmail ? (
                <span id="customer-email-error" className={styles.fieldError} role="alert">
                  {visibleCustomerErrors.customerEmail}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="customer-notes">
                Observações (opcional)
              </label>
              <textarea
                id="customer-notes"
                className={styles.textarea}
                placeholder="Alguma preferência para o atendimento?"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            {formError ? (
              <div className={`${styles.note} ${styles.error}`} role="alert">
                <p className={styles.noteText}>{formError}</p>
                {manualFallbackHref ? (
                  <div className={styles.manualFallbackActions}>
                    <a
                      className={styles.whatsappFallback}
                      href={manualFallbackHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar pedido pelo WhatsApp
                    </a>
                    <span className={styles.helper}>
                      O pedido já vai com serviço, data, horário e seus dados preenchidos.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {success ? (
              <div className={`${styles.note} ${styles.success}`}>
                <strong>Agendamento confirmado.</strong>
                <br />
                {success.serviceName} em {formatDateTime(success.start, success.timezone)}.
              </div>
            ) : null}

            {!requiredFieldsValid ? (
              <span id="booking-submit-hint" className={styles.helper}>
                Preencha Nome completo e WhatsApp corretamente para liberar a confirmação.
              </span>
            ) : null}
            <button
              className={styles.submit}
              type="submit"
              disabled={isSubmitting || !requiredFieldsValid}
              aria-describedby={!requiredFieldsValid ? "booking-submit-hint" : undefined}
            >
              {isSubmitting ? "Confirmando agendamento..." : "Confirmar agendamento"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
