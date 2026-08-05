export type EventType =
  | "futbol" | "basquet" | "padel" | "rugby" | "hockey"
  | "voley" | "running" | "ciclismo" | "asado" | "reunion" | "otro";

export const TYPE_LABEL: Record<EventType, string> = {
  futbol: "\u26BD Futbol", basquet: "\u{1F3C0} Basquet", padel: "\u{1F3BE} Padel",
  rugby: "\u{1F3C9} Rugby", hockey: "\u{1F3D1} Hockey", voley: "\u{1F3D0} Voley",
  running: "\u{1F3C3} Running", ciclismo: "\u{1F6B4} Ciclismo", asado: "\u{1F525} Asado",
  reunion: "\u{1F465} Reunion", otro: "\u{1F4CC} Evento"
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
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} \u00B7 ${hh}:${mm}hs`;
}
