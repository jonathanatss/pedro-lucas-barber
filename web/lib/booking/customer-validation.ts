import { z } from "zod";

export const bookingCustomerSchema = z.object({
  customerName: z.string().trim()
    .min(3, "Informe seu nome completo com pelo menos 3 caracteres.")
    .max(120, "Use no m\u00e1ximo 120 caracteres no nome."),
  customerPhone: z.string().trim()
    .min(1, "Informe seu WhatsApp com DDD.")
    .max(30, "Use no m\u00e1ximo 30 caracteres no WhatsApp.")
    .refine(
      (value) => /^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 8,
      "Informe um WhatsApp v\u00e1lido com DDD, como (84) 99999-9999.",
    ),
  customerEmail: z.string().trim().email("Informe um e-mail v\u00e1lido.")
    .optional().or(z.literal("")),
});

export type BookingCustomerField = keyof z.infer<typeof bookingCustomerSchema>;
export type BookingCustomerErrors = Partial<Record<BookingCustomerField, string>>;

const requiredCustomerSchema = bookingCustomerSchema.pick({
  customerName: true,
  customerPhone: true,
});

export function areRequiredCustomerFieldsValid(input: unknown) {
  return requiredCustomerSchema.safeParse(input).success;
}

export function getBookingCustomerErrors(input: unknown): BookingCustomerErrors {
  const result = bookingCustomerSchema.safeParse(input);
  if (result.success) {
    return {};
  }

  const errors: BookingCustomerErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as BookingCustomerField;
    if (field in bookingCustomerSchema.shape && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
