export const bookingConfirmationError =
  "Não foi possível obter a confirmação. Consulte a barbearia pelo WhatsApp antes de tentar novamente.";

export const membershipCheckoutError =
  "Não foi possível iniciar a assinatura. Tente mais tarde ou fale com a barbearia.";

export function getPublicBookingError(code: string) {
  switch (code) {
    case "slot_in_past":
      return "Esse horário já passou. Escolha outro horário.";
    case "slot_unavailable":
    case "slot_conflict":
      return "Esse horário não está mais disponível. Escolha outro horário.";
    case "invalid_service":
      return "Escolha um serviço disponível.";
    default:
      return bookingConfirmationError;
  }
}

export function getPublicMembershipError(code: string) {
  return code === "invalid_plan" ? "Escolha um plano disponível." : membershipCheckoutError;
}
