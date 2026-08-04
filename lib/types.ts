export type EventType =
  | "futbol" | "basquet" | "padel" | "rugby" | "hockey"
  | "voley" | "running" | "ciclismo" | "asado" | "reunion" | "otro";

export const TYPE_LABEL: Record<EventType, string> = {
  futbol: "âš½ Futbol", basquet: "ðŸ€ Basquet", padel: "ðŸŽ¾ Padel",
  rugby: "ðŸ‰ Rugby", hockey: "ðŸ‘ Hockey", voley: "ðŸ Voley",
  running: "ðŸƒ Running", ciclismo: "ðŸš´ Ciclismo", asado: "ðŸ”¥ Asado",
  reunion: "ðŸ‘¥ Reunion", otro: "ðŸ“Œ Evento"
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
  const dias = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} Â· ${hh}:${mm}hs`;
}
