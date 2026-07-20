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

type AdminUser = {
  displayName: string;
  id: string;
  mustChangePassword: boolean;
  role: "barber" | "support";
  sessionVersion: number;
  username: string;
};

type ManagedAdminUser = {
  createdAt: string;
  displayName: string;
  id: string;
  isActive: boolean;
  mustChangePassword: boolean;
  role: "barber" | "support";
  username: string;
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
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedAdminUser[]>([]);
  const [agenda, setAgenda] = useState<AgendaPayload | null>(null);
  const [businessHoursDraft, setBusinessHoursDraft] = useState<BusinessHour[]>([]);
  const [configured, setConfigured] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("suporte");
  const [password, setPassword] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [barberUserForm, setBarberUserForm] = useState({
    displayName: "Pedro Lucas",
    password: "",
    username: "barbeiro",
  });
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
        setAdminUser(null);
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

  async function loadAdminUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });

    if (response.status === 403) {
      setManagedUsers([]);
      return;
    }

    const payload = await readJsonResponse<{ users: ManagedAdminUser[] }>(response);
    setManagedUsers(payload.users);
  }

  useEffect(() => {
    async function boot() {
      try {
        const response = await fetch("/api/admin/auth", { cache: "no-store" });
        const payload = await readJsonResponse<{
          authenticated: boolean;
          configured: boolean;
          user: AdminUser | null;
        }>(response);

        setConfigured(payload.configured);
        setAdminUser(payload.user);

        if (payload.authenticated && payload.user) {
          await Promise.all([
            loadAgenda(),
            payload.user.role === "support" ? loadAdminUsers() : Promise.resolve(),
          ]);
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
      const payload = await readJsonResponse<{
        authenticated: boolean;
        user: AdminUser;
      }>(
        await fetch("/api/admin/auth", {
          body: JSON.stringify({ password, username }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );

      setAdminUser(payload.user);
      setPassword("");
      await Promise.all([
        loadAgenda(),
        payload.user.role === "support" ? loadAdminUsers() : Promise.resolve(),
      ]);
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
    setAdminUser(null);
    setManagedUsers([]);
    setIsAuthenticated(false);
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = await readJsonResponse<{
        authenticated: boolean;
        user: AdminUser;
      }>(
        await fetch("/api/admin/auth", {
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }),
      );

      setAdminUser(payload.user);
      setPasswordForm({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
      setMessage("Senha alterada. As outras sessões deste usuário foram encerradas.");
      if (payload.user.role === "support") {
        await loadAdminUsers();
      }
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBarberUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await readJsonResponse(
        await fetch("/api/admin/users", {
          body: JSON.stringify(barberUserForm),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );

      setBarberUserForm((current) => ({ ...current, password: "" }));
      setMessage(
        "Credencial do barbeiro salva. Ele deverá trocar a senha temporária no primeiro acesso.",
      );
      await loadAdminUsers();
    } catch (saveUserError) {
      setError(
        saveUserError instanceof Error
          ? saveUserError.message
          : "Não foi possível salvar a credencial do barbeiro.",
      );
    } finally {
      setIsSaving(false);
    }
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
          <h1 className={styles.title}>Configure o acesso administrativo.</h1>
          <p className={styles.lead}>
            Verifique as credenciais do Supabase e defina `ADMIN_SESSION_SECRET` ou
            `ADMIN_PASSWORD` na Netlify.
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
            Cada pessoa usa sua própria credencial. O acesso do suporte permanece
            separado do acesso do barbeiro.
          </p>

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.label} htmlFor="admin-username">
              Usuário
            </label>
            <input
              id="admin-username"
              autoComplete="username"
              className={styles.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label className={styles.label} htmlFor="admin-password">
              Senha
            </label>
            <input
              id="admin-password"
              autoComplete="current-password"
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
          {adminUser ? (
            <div className={styles.accountBadge}>
              {adminUser.displayName} · {adminUser.role === "support" ? "Suporte" : "Barbeiro"}
            </div>
          ) : null}
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
      {adminUser?.mustChangePassword ? (
        <div className={styles.warning}>
          Esta é uma senha temporária. Altere-a na seção “Segurança da conta”.
        </div>
      ) : null}

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
                  <div className={styles.appointmentActions}>
                    <span className={styles.statusPill}>{appointment.status}</span>
                    {adminUser?.role === "support" ? (
                      <button
                        className={styles.dangerButton}
                        disabled={isSaving}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Cancelar o agendamento de ${appointment.customerName}? O horário ficará disponível novamente.`,
                            )
                          ) {
                            void runAgendaAction(
                              {
                                id: appointment.id,
                                type: "cancelAppointment",
                              },
                              "Agendamento cancelado e horário liberado.",
                            );
                          }
                        }}
                        type="button"
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className={styles.empty}>Nenhum agendamento futuro encontrado.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>Segurança da conta</span>
          <h2 className={styles.cardTitle}>Alterar minha senha</h2>
          <p className={styles.copy}>
            A alteração encerra automaticamente outras sessões abertas com esta
            credencial.
          </p>

          <form className={styles.formGrid} onSubmit={handlePasswordChange}>
            <label className={styles.label}>
              Senha atual
              <input
                autoComplete="current-password"
                className={styles.input}
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.label}>
              Nova senha
              <input
                autoComplete="new-password"
                className={styles.input}
                minLength={10}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.label}>
              Confirmar nova senha
              <input
                autoComplete="new-password"
                className={styles.input}
                minLength={10}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </label>
            <p className={styles.passwordHint}>
              Use ao menos 10 caracteres, com maiúscula, minúscula e número.
            </p>
            <button className={styles.primaryButton} disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Alterar senha"}
            </button>
          </form>
        </div>

        {adminUser?.role === "support" ? (
          <div className={styles.card}>
            <span className={styles.eyebrow}>Acessos do painel</span>
            <h2 className={styles.cardTitle}>Credencial do barbeiro</h2>
            <p className={styles.copy}>
              Crie a primeira credencial ou redefina a senha temporária sem alterar
              a sua conta de suporte.
            </p>

            <form className={styles.formGrid} onSubmit={handleSaveBarberUser}>
              <label className={styles.label}>
                Nome
                <input
                  className={styles.input}
                  value={barberUserForm.displayName}
                  onChange={(event) =>
                    setBarberUserForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.label}>
                Usuário
                <input
                  autoComplete="off"
                  className={styles.input}
                  value={barberUserForm.username}
                  onChange={(event) =>
                    setBarberUserForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.label}>
                Senha temporária
                <input
                  autoComplete="new-password"
                  className={styles.input}
                  minLength={10}
                  type="password"
                  value={barberUserForm.password}
                  onChange={(event) =>
                    setBarberUserForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <button className={styles.primaryButton} disabled={isSaving} type="submit">
                {isSaving ? "Salvando..." : "Salvar credencial"}
              </button>
            </form>

            <div className={styles.list}>
              {managedUsers.map((user) => (
                <article className={styles.listItem} key={user.id}>
                  <div>
                    <strong>{user.displayName}</strong>
                    <p>@{user.username} · {user.role === "support" ? "Suporte" : "Barbeiro"}</p>
                  </div>
                  <span className={styles.statusPill}>
                    {user.mustChangePassword ? "Senha temporária" : "Ativo"}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <span className={styles.eyebrow}>Perfil de acesso</span>
            <h2 className={styles.cardTitle}>Conta do barbeiro</h2>
            <p className={styles.copy}>
              Esta conta pode administrar a agenda e alterar a própria senha. O
              gerenciamento de outros usuários fica reservado ao suporte.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
