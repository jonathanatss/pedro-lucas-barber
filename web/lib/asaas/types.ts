export type AsaasEnvironment = "sandbox" | "production";

export type MembershipPlan = {
  active: boolean;
  benefits: string[];
  cycle: "MONTHLY";
  description: string;
  id?: string;
  name: string;
  priceCents: number;
  slug: string;
  sortOrder: number;
};

export type CreateCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
  externalReference: string;
  membershipId: string;
};

export type AsaasCheckoutResponse = {
  id: string;
  link?: string | null;
};

export type AsaasWebhookPayload = {
  checkout?: Record<string, unknown>;
  dateCreated?: string;
  event?: string;
  id?: string;
  payment?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
};
