import { asaasApiBaseUrl, getAsaasApiKey } from "@/lib/asaas/config";

type AsaasRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "DELETE";
};

export class AsaasApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
  }
}

function getAsaasErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "errors" in payload &&
    Array.isArray((payload as { errors: unknown }).errors)
  ) {
    const [firstError] = (payload as { errors: Array<{ description?: string }> }).errors;
    return firstError?.description ?? "A API do Asaas recusou a solicitação.";
  }

  return "A API do Asaas recusou a solicitação.";
}

export async function asaasRequest<TResponse>(
  path: string,
  options: AsaasRequestOptions = {},
) {
  const apiKey = getAsaasApiKey();

  if (!apiKey) {
    throw new AsaasApiError("A chave de API do Asaas ainda não foi configurada.", 503, null);
  }

  const response = await fetch(`${asaasApiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "pedro-lucas-barber",
      access_token: apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AsaasApiError(getAsaasErrorMessage(payload), response.status, payload);
  }

  return payload as TResponse;
}
