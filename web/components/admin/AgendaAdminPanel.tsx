"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./AgendaAdminPanel.module.css";

type BusinessHour = {
  closesAt: string;
  isClosed: boolean;
  opensAt: string;
  weekday: number;
};

type BusinessDayOverride = {
  closesAt: string;
  date: string;
  id: string;
  isClosed: boolean;
  opensAt: string;
  reason: string | null;
};

type BlockedPeriod = {
  endsAt: string;
  id: string;
  reason: string | null;
  startsAt: string;
};

type Appointment = {
  barberWhatsappProvider: string | null;
  barberWhatsappStatus: string;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string;
  endsAt: string;
  id: string;
  notes: string | null;
  serviceName: string;
  servicePriceLabel: string | null;
  startsAt: string;
  status: string;
};

type AgendaPayload = {
  appointments: Appointment[];
  blockedPeriods: BlockedPeriod[];
  businessHours: BusinessHour[];
  overrides: BusinessDayOverride[];
  timezone: string;
};

const weekdayLabels = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function getTodayInTimezone(timezone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeBusinessHours(businessHours: BusinessHour[]) {
  return weekdayLabels.map((_, weekday) => {
    const existing = businessHours.find((item) => item.weekday === weekday);

    return (
      existing ?? {
        closesAt: "19:00",
        isClosed: weekday === 0,
        opensAt: "09:00",
        weekday,
      }
    );
  });
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getWhatsAppStatusLabel(status: string) {
  if (status === "sent") {
    return "WhatsApp enviado";
  }

  if (status === "failed") {
    return "WhatsApp falhou";
  }

  return "WhatsApp nao configurado";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  }

  return payload as T;
}

export default function AgendaAdminPanel() {
  const [agenda, setAgenda] = useState<AgendaPayload | null>(null);
  const [businessHoursDraft, setBusinessHoursDraft] = useState<BusinessHour[]>([]);
  const [configured, setConfigured] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    closesAt: "19:00",
    date: getTodayInTimezone(),
    isClosed: false,
    opensAt: "09:00",
    reason: "",
  });
  const [blockForm, setBlockForm] = useState({
    date: getTodayInTimezone(),
    endsAt: "13:00",
    reason: "Almoço",
    startsAt: "12:00",
  });

  const timezone = agenda?.timezone ?? "America/Sao_Paulo";

  const upcomingAppointments = useMemo(
    () => agenda?.appointments.slice(0, 12) ?? [],
    [agenda],
  );

  async function loadAgenda() {
    setIsBooting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/agenda", { cache: "no-store" });

      if (response.status === 401) {
        setAgenda(null);
        setIsAuthenticated(false);
        return;
      }

      const payload = await readJsonResponse<AgendaPayload>(response);

      setAgenda(payload);
      setBusinessHoursDraft(normalizeBusinessHours(payload.businessHours));
      setIsAuthenticated(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a agenda.",
      );
    } finally {
      setIsBooting(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const response = await fetch("/api/admin/auth", { cache: "no-store" });
        const payload = await readJsonResponse<{
          authenticated: boolean;
          configured: boolean;
        }>(response);

        setConfigured(payload.configured);

        if (payload.authenticated) {
          await loadAgenda();
          return;
        }
      } catch {
        setConfigured(false);
      }

      setIsBooting(false);
    }

    void boot();
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await readJsonResponse(
        await fetch("/api/admin/auth", {
          body: JSON.stringify({ password }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );

      setPassword("");
      await loadAgenda();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar no painel.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAgenda(null);
    setIsAuthenticated(false);
  }

  async function saveBusinessHours() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await readJsonResponse<AgendaPayload>(
        await fetch("/api/admin/agenda", {
          body: JSON.stringify({ businessHours: businessHoursDraft }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        }),
      );

      setAgenda(payload);
      setBusinessHoursDraft(normalizeBusinessHours(payload.businessHours));
      setMessage("Horários padrão atualizados.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os horários.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function runAgendaAction(body: unknown, successMessage: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await readJsonResponse<AgendaPayload>(
        await fetch("/api/admin/agenda", {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );

      setAgenda(payload);
      setBusinessHoursDraft(normalizeBusinessHours(payload.businessHours));
      setMessage(successMessage);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível atualizar a agenda.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateBusinessHour(
    weekday: number,
    key: keyof BusinessHour,
    value: string | boolean,
  ) {
    setBusinessHoursDraft((current) =>
      current.map((businessHour) =>
        businessHour.weekday === weekday
          ? { ...businessHour, [key]: value }
          : businessHour,
      ),
    );
  }

  if (isBooting) {
    return (
      <main className={styles.shell}>
        <section className={styles.card}>
          <span className={styles.eyebrow}>Painel da agenda</span>
          <h1 className={styles.title}>Carregando controle operacional...</h1>
        </section>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className={styles.shell}>
        <section className={styles.card}>
          <span className={styles.eyebrow}>Configuração pendente</span>
          <h1 className={styles.title}>Defina `ADMIN_PASSWORD` na Netlify.</h1>
          <p className={styles.lead}>
            Depois de salvar a variável de ambiente e publicar novamente, o dono da
            barbearia poderá acessar este painel.
          </p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.shell}>
        <section className={`${styles.card} ${styles.loginCard}`}>
          <span className={styles.eyebrow}>Acesso do proprietário</span>
          <h1 className={styles.title}>Entrar no painel da agenda</h1>
          <p className={styles.lead}>
            Use a senha administrativa para editar horários, exceções e bloqueios
            sem alterar código.
          </p>

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.label} htmlFor="admin-password">
              Senha administrativa
            </label>
            <input
              id="admin-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <div className={styles.error}>{error}</div> : null}
            <button className={styles.primaryButton} disabled={isSaving} type="submit">
              {isSaving ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Controle em tempo real</span>
          <h1 className={styles.title}>Painel da agenda</h1>
          <p className={styles.lead}>
            Ajuste a semana padrão, feche dias específicos, estenda o expediente
            ou bloqueie intervalos como almoço e compromissos.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.secondaryButton} onClick={loadAgenda} type="button">
            Atualizar dados
          </button>
          <button className={styles.ghostButton} onClick={handleLogout} type="button">
            Sair
          </button>
        </div>
      </section>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Semana padrão</span>
              <h2 className={styles.cardTitle}>Horário recorrente</h2>
            </div>
            <button
              className={styles.primaryButton}
              disabled={isSaving}
              onClick={saveBusinessHours}
              type="button"
            >
              Salvar semana
            </button>
          </div>

          <div className={styles.weekList}>
            {businessHoursDraft.map((businessHour) => (
              <div className={styles.weekRow} key={businessHour.weekday}>
                <strong>{weekdayLabels[businessHour.weekday]}</strong>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={businessHour.isClosed}
                    onChange={(event) =>
                      updateBusinessHour(
                        businessHour.weekday,
                        "isClosed",
                        event.target.checked,
                      )
                    }
                  />
                  Fechado
                </label>
                <input
                  className={styles.timeInput}
                  disabled={businessHour.isClosed}
                  type="time"
                  value={businessHour.opensAt}
                  onChange={(event) =>
                    updateBusinessHour(
                      businessHour.weekday,
                      "opensAt",
                      event.target.value,
                    )
                  }
                />
                <span className={styles.toText}>até</span>
                <input
                  className={styles.timeInput}
                  disabled={businessHour.isClosed}
                  type="time"
                  value={businessHour.closesAt}
                  onChange={(event) =>
                    updateBusinessHour(
                      businessHour.weekday,
                      "closesAt",
                      event.target.value,
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.eyebrow}>Exceções</span>
          <h2 className={styles.cardTitle}>Dia específico</h2>
          <p className={styles.copy}>
            Use para fechar em feriados, abrir mais tarde ou estender o horário de
            uma data especial.
          </p>

          <form
            className={styles.formGrid}
            onSubmit={(event) => {
              event.preventDefault();
              void runAgendaAction(
                { override: overrideForm, type: "upsertOverride" },
                "Exceção de data salva.",
              );
            }}
          >
            <label className={styles.label}>
              Data
              <input
                className={styles.input}
                type="date"
                value={overrideForm.date}
                onChange={(event) =>
                  setOverrideForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={overrideForm.isClosed}
                onChange={(event) =>
                  setOverrideForm((current) => ({
                    ...current,
                    isClosed: event.target.checked,
                  }))
                }
              />
              Fechar o dia inteiro
            </label>
            <div className={styles.twoColumns}>
              <label className={styles.label}>
                Abre
                <input
                  className={styles.input}
                  disabled={overrideForm.isClosed}
                  type="time"
                  value={overrideForm.opensAt}
                  onChange={(event) =>
                    setOverrideForm((current) => ({
                      ...current,
                      opensAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.label}>
                Fecha
                <input
                  className={styles.input}
                  disabled={overrideForm.isClosed}
                  type="time"
                  value={overrideForm.closesAt}
                  onChange={(event) =>
                    setOverrideForm((current) => ({
                      ...current,
                      closesAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className={styles.label}>
              Motivo
              <input
                className={styles.input}
                placeholder="Feriado, evento, manutenção..."
                value={overrideForm.reason}
                onChange={(event) =>
                  setOverrideForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </label>
            <button className={styles.primaryButton} disabled={isSaving} type="submit">
              Salvar exceção
            </button>
          </form>

          <div className={styles.list}>
            {agenda?.overrides.length ? (
              agenda.overrides.map((override) => (
                <article className={styles.listItem} key={override.id}>
                  <div>
                    <strong>{formatDate(override.date, timezone)}</strong>
                    <p>
                      {override.isClosed
                        ? "Fechado"
                        : `${override.opensAt} às ${override.closesAt}`}
                      {override.reason ? ` · ${override.reason}` : ""}
                    </p>
                  </div>
                  <button
                    className={styles.dangerButton}
                    disabled={isSaving}
                    onClick={() =>
                      runAgendaAction(
                        { id: override.id, type: "deleteOverride" },
                        "Exceção removida.",
                      )
                    }
                    type="button"
                  >
                    Remover
                  </button>
                </article>
              ))
            ) : (
              <p className={styles.empty}>Nenhuma exceção futura cadastrada.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>Almoço e bloqueios</span>
          <h2 className={styles.cardTitle}>Bloquear intervalo</h2>
          <p className={styles.copy}>
            Qualquer intervalo bloqueado desaparece da agenda pública
            imediatamente. A pausa recorrente de almoço já fica reservada das
            12:00 às 13:00.
          </p>

          <form
            className={styles.formGrid}
            onSubmit={(event) => {
              event.preventDefault();
              void runAgendaAction(
                { block: blockForm, type: "createBlock" },
                "Intervalo bloqueado.",
              );
            }}
          >
            <label className={styles.label}>
              Data
              <input
                className={styles.input}
                type="date"
                value={blockForm.date}
                onChange={(event) =>
                  setBlockForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <div className={styles.twoColumns}>
              <label className={styles.label}>
                Início
                <input
                  className={styles.input}
                  type="time"
                  value={blockForm.startsAt}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.label}>
                Fim
                <input
                  className={styles.input}
                  type="time"
                  value={blockForm.endsAt}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className={styles.label}>
              Motivo
              <input
                className={styles.input}
                value={blockForm.reason}
                onChange={(event) =>
                  setBlockForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </label>
            <button className={styles.primaryButton} disabled={isSaving} type="submit">
              Bloquear intervalo
            </button>
          </form>

          <div className={styles.list}>
            {agenda?.blockedPeriods.length ? (
              agenda.blockedPeriods.map((block) => (
                <article className={styles.listItem} key={block.id}>
                  <div>
                    <strong>
                      {formatDateTime(block.startsAt, timezone)} até{" "}
                      {formatDateTime(block.endsAt, timezone)}
                    </strong>
                    <p>{block.reason ?? "Bloqueio"}</p>
                  </div>
                  <button
                    className={styles.dangerButton}
                    disabled={isSaving}
                    onClick={() =>
                      runAgendaAction(
                        { id: block.id, type: "deleteBlock" },
                        "Bloqueio removido.",
                      )
                    }
                    type="button"
                  >
                    Remover
                  </button>
                </article>
              ))
            ) : (
              <p className={styles.empty}>Nenhum bloqueio futuro cadastrado.</p>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.eyebrow}>Operação</span>
          <h2 className={styles.cardTitle}>Próximos agendamentos</h2>
          <div className={styles.list}>
            {upcomingAppointments.length ? (
              upcomingAppointments.map((appointment) => (
                <article className={styles.listItem} key={appointment.id}>
                  <div>
                    <strong>{formatDateTime(appointment.startsAt, timezone)}</strong>
                    <p>
                      {appointment.serviceName}
                      {appointment.servicePriceLabel
                        ? ` · ${appointment.servicePriceLabel}`
                        : ""}{" "}
                      · {appointment.customerName}
                    </p>
                    <p>{appointment.customerPhone}</p>
                    <span
                      className={`${styles.notificationPill} ${
                        appointment.barberWhatsappStatus === "sent"
                          ? styles.notificationPillSent
                          : appointment.barberWhatsappStatus === "failed"
                            ? styles.notificationPillFailed
                            : ""
                      }`.trim()}
                    >
                      {getWhatsAppStatusLabel(appointment.barberWhatsappStatus)}
                    </span>
                  </div>
                  <span className={styles.statusPill}>{appointment.status}</span>
                </article>
              ))
            ) : (
              <p className={styles.empty}>Nenhum agendamento futuro encontrado.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
