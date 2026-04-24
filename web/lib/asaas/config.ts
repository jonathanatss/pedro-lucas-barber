import { asaasEnvironment, env, siteUrl } from "@/lib/env";

export const asaasApiBaseUrl =
  asaasEnvironment === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export const asaasCheckoutBaseUrl =
  asaasEnvironment === "production"
    ? "https://asaas.com/checkoutSession/show"
    : "https://sandbox.asaas.com/checkoutSession/show";

export function getAsaasCheckoutUrl(checkoutId: string) {
  const url = new URL(asaasCheckoutBaseUrl);
  url.searchParams.set("id", checkoutId);
  return url.toString();
}

export function getCheckoutCallbackUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export function getAsaasApiKey() {
  return env.ASAAS_API_KEY;
}

export function getAsaasWebhookToken() {
  return env.ASAAS_WEBHOOK_TOKEN;
}
