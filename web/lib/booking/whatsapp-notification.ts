import { formatInTimeZone } from "date-fns-tz";

import {
  bookingTimezone,
  env,
  hasWhatsAppCloudCredentials,
  hasWhatsAppWebhookCredentials,
} from "@/lib/env";

type WhatsAppNotificationInput = {
  appointmentId: string;
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
  end: Date;
  googleEventId?: string | null;
  notes?: string | null;
  serviceName: string;
  start: Date;
  syncStatus: "confirmed" | "pending_sync";
  timezone: string;
};

export type WhatsAppNotificationResult = {
  error?: string | null;
  messageId?: string | null;
  provider: "none" | "webhook" | "whatsapp_cloud";
  sentAt?: string | null;
  status: "failed" | "not_configured" | "sent";
};

type WebhookResponse = {
  id?: string;
  messageId?: string;
};

type CloudApiResponse = {
  error?: {
    code?: number;
    message?: string;
  };
  messages?: Array<{
    id?: string;
  }>;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDate(input: WhatsAppNotificationInput) {
  return formatInTimeZone(input.start, input.timezone || bookingTimezone, "dd/MM/yyyy");
}

function formatTime(input: WhatsAppNotificationInput) {
  return formatInTimeZone(input.start, input.timezone || bookingTimezone, "HH:mm");
}

function getNotes(input: WhatsAppNotificationInput) {
  return input.notes?.trim() || "Sem observacoes";
}

function buildMessage(input: WhatsAppNotificationInput) {
  return [
    "Novo agendamento confirmado",
    "",
    `Servico: ${input.serviceName}`,
    `Cliente: ${input.customerName}`,
    `WhatsApp: ${input.customerPhone}`,
    input.customerEmail ? `E-mail: ${input.customerEmail}` : null,
    `Data: ${formatDate(input)}`,
    `Horario: ${formatTime(input)}`,
    `Observacoes: ${getNotes(input)}`,
    `Status calendario: ${input.syncStatus}`,
    `ID: ${input.appointmentId}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return `${response.status} ${response.statusText}`.trim();
  }

  return text.slice(0, 500);
}

async function sendWebhookNotification(
  input: WhatsAppNotificationInput,
  recipientPhone: string,
  message: string,
): Promise<WhatsAppNotificationResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.WHATSAPP_NOTIFICATION_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.WHATSAPP_NOTIFICATION_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(env.WHATSAPP_NOTIFICATION_WEBHOOK_URL!, {
    body: JSON.stringify({
      appointment: {
        id: input.appointmentId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        end: input.end.toISOString(),
        googleEventId: input.googleEventId,
        notes: input.notes,
        serviceName: input.serviceName,
        start: input.start.toISOString(),
        syncStatus: input.syncStatus,
        timezone: input.timezone,
      },
      event: "appointment.confirmed",
      message,
      recipient: {
        phone: recipientPhone,
      },
    }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    return {
      error: await readError(response),
      provider: "webhook",
      status: "failed",
    };
  }

  const payload = (await response.json().catch(() => ({}))) as WebhookResponse;

  return {
    messageId: payload.messageId ?? payload.id ?? null,
    provider: "webhook",
    sentAt: new Date().toISOString(),
    status: "sent",
  };
}

function buildCloudApiBody(input: WhatsAppNotificationInput, recipientPhone: string, message: string) {
  if (!env.WHATSAPP_CLOUD_TEMPLATE_NAME) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      text: {
        body: message,
        preview_url: false,
      },
      to: recipientPhone,
      type: "text",
    };
  }

  const parameters = [
    input.serviceName,
    input.customerName,
    input.customerPhone,
    formatDate(input),
    formatTime(input),
    getNotes(input),
    input.appointmentId,
  ].map((text) => ({
    text,
    type: "text",
  }));

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    template: {
      components: [
        {
          parameters,
          type: "body",
        },
      ],
      language: {
        code: env.WHATSAPP_CLOUD_TEMPLATE_LANGUAGE ?? "pt_BR",
      },
      name: env.WHATSAPP_CLOUD_TEMPLATE_NAME,
    },
    to: recipientPhone,
    type: "template",
  };
}

async function sendCloudApiNotification(
  input: WhatsAppNotificationInput,
  recipientPhone: string,
  message: string,
): Promise<WhatsAppNotificationResult> {
  const apiVersion = env.WHATSAPP_CLOUD_API_VERSION ?? "v23.0";
  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`,
    {
      body: JSON.stringify(buildCloudApiBody(input, recipientPhone, message)),
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_CLOUD_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as CloudApiResponse;

  if (!response.ok || payload.error) {
    return {
      error: payload.error?.message ?? (await readError(response)),
      provider: "whatsapp_cloud",
      status: "failed",
    };
  }

  return {
    messageId: payload.messages?.[0]?.id ?? null,
    provider: "whatsapp_cloud",
    sentAt: new Date().toISOString(),
    status: "sent",
  };
}

export async function notifyBarberOnWhatsApp(
  input: WhatsAppNotificationInput,
): Promise<WhatsAppNotificationResult> {
  const recipientPhone = onlyDigits(env.WHATSAPP_BARBER_PHONE ?? "");

  if (!recipientPhone) {
    return {
      error: "WHATSAPP_BARBER_PHONE nao configurado.",
      provider: "none",
      status: "not_configured",
    };
  }

  const message = buildMessage(input);

  try {
    if (hasWhatsAppWebhookCredentials) {
      return await sendWebhookNotification(input, recipientPhone, message);
    }

    if (hasWhatsAppCloudCredentials) {
      return await sendCloudApiNotification(input, recipientPhone, message);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao enviar WhatsApp.",
      provider: hasWhatsAppWebhookCredentials ? "webhook" : "whatsapp_cloud",
      status: "failed",
    };
  }

  return {
    error: "Configure webhook ou WhatsApp Cloud API para ativar a notificacao.",
    provider: "none",
    status: "not_configured",
  };
}
