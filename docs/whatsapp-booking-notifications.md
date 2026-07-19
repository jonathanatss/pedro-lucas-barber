# WhatsApp booking notifications

The booking flow can notify the barber on WhatsApp after each confirmed appointment.

The appointment is always saved first. If WhatsApp delivery fails, the appointment remains confirmed and the notification status is saved in `appointments`.

## Option 1: Webhook provider

Use this when WhatsApp is sent by Make, n8n, Z-API, Evolution API, Zapier, or another automation service.

Netlify environment variables:

```env
WHATSAPP_BARBER_PHONE=5584999999999
WHATSAPP_NOTIFICATION_WEBHOOK_URL=https://your-webhook-url
WHATSAPP_NOTIFICATION_WEBHOOK_TOKEN=optional-secret-token
```

Webhook payload:

```json
{
  "event": "appointment.confirmed",
  "recipient": {
    "phone": "5584999999999"
  },
  "message": "Novo agendamento confirmado...",
  "appointment": {
    "id": "uuid",
    "customerName": "Cliente",
    "customerPhone": "5584999999999",
    "customerEmail": "cliente@email.com",
    "serviceName": "Corte de Cabelo",
    "start": "2026-07-20T12:00:00.000Z",
    "end": "2026-07-20T12:45:00.000Z",
    "timezone": "America/Sao_Paulo",
    "syncStatus": "confirmed"
  }
}
```

If `WHATSAPP_NOTIFICATION_WEBHOOK_TOKEN` is configured, the app sends it as:

```http
Authorization: Bearer <token>
```

## Option 2: Meta WhatsApp Cloud API

Use this when the business has a WhatsApp Business Platform account.

Netlify environment variables:

```env
WHATSAPP_BARBER_PHONE=5584999999999
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_CLOUD_PHONE_NUMBER_ID=
WHATSAPP_CLOUD_TEMPLATE_NAME=novo_agendamento_barbeiro
```

Optional variables:

```env
WHATSAPP_CLOUD_API_VERSION=v23.0
WHATSAPP_CLOUD_TEMPLATE_LANGUAGE=pt_BR
```

Recommended approved template body:

```text
Novo agendamento confirmado:
Servico: {{1}}
Cliente: {{2}}
WhatsApp: {{3}}
Data: {{4}}
Horario: {{5}}
Observacoes: {{6}}
ID: {{7}}
```

If `WHATSAPP_CLOUD_TEMPLATE_NAME` is not configured, the app sends a plain text message. On the official WhatsApp Business Platform, plain text messages may fail outside an active customer service window, so the template flow is recommended.

## Stored status

The notification result is saved in the appointment row:

```text
barber_whatsapp_status: not_configured | sent | failed
barber_whatsapp_provider: none | webhook | whatsapp_cloud
barber_whatsapp_message_id
barber_whatsapp_notified_at
barber_whatsapp_error
```
