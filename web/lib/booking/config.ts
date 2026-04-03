import type { BookingCatalog } from "@/lib/booking/types";

import { bookingTimezone } from "@/lib/env";

export const slotIntervalMinutes = 15;

export const fallbackCatalog: BookingCatalog = {
  timezone: bookingTimezone,
  source: "fallback",
  services: [
    {
      slug: "corte-de-cabelo",
      name: "Corte de Cabelo",
      description:
        "Corte personalizado com acabamento impecável, lavagem e finalização profissional.",
      durationMinutes: 40,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      priceLabel: "R$ 35",
      sortOrder: 1,
      active: true,
    },
    {
      slug: "barba",
      name: "Barba",
      description:
        "Design, aparagem e hidratação da barba com navalha quente e produtos premium.",
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      priceLabel: "R$ 30",
      sortOrder: 2,
      active: true,
    },
    {
      slug: "combo-completo",
      name: "Combo Completo",
      description:
        "Corte + barba com todo o cuidado que você merece. O combo mais pedido da casa.",
      durationMinutes: 70,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 10,
      priceLabel: "R$ 60",
      sortOrder: 3,
      active: true,
    },
    {
      slug: "sobrancelha",
      name: "Sobrancelha",
      description:
        "Design e alinhamento de sobrancelha com navalha para um acabamento preciso.",
      durationMinutes: 10,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      priceLabel: "R$ 10",
      sortOrder: 4,
      active: true,
    },
    {
      slug: "pezinho",
      name: "Pezinho",
      description:
        "Acabamento da nuca e contorno inferior do corte para um resultado mais limpo e definido.",
      durationMinutes: 10,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      priceLabel: "R$ 10",
      sortOrder: 5,
      active: true,
    },
  ],
  businessHours: [
    { weekday: 0, opensAt: "09:00", closesAt: "18:00", isClosed: true },
    { weekday: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { weekday: 2, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { weekday: 3, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { weekday: 4, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { weekday: 5, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { weekday: 6, opensAt: "09:00", closesAt: "18:00", isClosed: false },
  ],
};
