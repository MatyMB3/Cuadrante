export type EventType =
  | "futbol" | "basquet" | "padel" | "rugby" | "hockey"
  | "voley" | "running" | "ciclismo" | "asado" | "reunion" | "otro";

export const TYPE_LABEL: Record<EventType, string> = {
  futbol: "⚽ Fútbol", basquet: "🏀 Básquet", padel: "🎾 Pádel",
  rugby: "🏉 Rugby", hockey: "🏑 Hockey", voley: "🏐 Vóley",
  running: "🏃 Running", ciclismo: "🚴 Ciclismo", asado: "🔥 Asado",
  reunion: "👥 Reunión", otro: "📌 Evento"
};

export type EventRow = {
  id: string;
  organizer_id: string;
  type: EventType;
  title: string;
  location: string | null;
  starts_at: string;
  max_slots: number | null;
  price: number | null;
  status: "draft" | "open" | "full" | "closed" | "cancelled";
  created_at: string;
};

export type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  status: "pending" | "going" | "not_going" | "waitlist";
  responded_at: string | null;
  joined_at: string;
};

export function fmtDate(iso: string) {
  const d = new Date(iso);
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} · ${hh}:${mm}hs`;
}
