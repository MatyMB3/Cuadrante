"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { EventRow, EventType, ParticipantRow, TYPE_LABEL, fmtDate } from "@/lib/types";

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [myPid, setMyPid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
    const { data: parts } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id)
      .order("joined_at", { ascending: true });
    setEvent(ev as EventRow);
    setParticipants((parts as ParticipantRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const stored = sessionStorage.getItem(`cuadrante_pid_${id}`);
    if (stored) setMyPid(stored);

    const channel = supabase
      .channel(`event-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `event_id=eq.${id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `id=eq.${id}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-400">Cargando...</div>;
  if (!event)
    return (
      <div className="p-6">
        <p>No encontramos este evento.</p>
        <Link href="/" className="text-sm underline">Volver</Link>
      </div>
    );

  const going = participants.filter((p) => p.status === "going");
  const pending = participants.filter((p) => p.status === "pending");
  const notGoing = participants.filter((p) => p.status === "not_going");
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const isFull = !!event.max_slots && going.length >= event.max_slots;
  const isCancelled = event.status === "cancelled";
  const isOwner = !!session && session.user.id === event.organizer_id;
  const mine = participants.find((p) => p.id === myPid);

  async function respond(status: "going" | "not_going" | "waitlist") {
    let pid = myPid;
    if (!pid) {
      const name = prompt("Tu nombre para que te vean en la lista:");
      if (!name) return;
      const { data, error } = await supabase
        .from("participants")
        .insert({ event_id: id, name: name.trim(), status })
        .select()
        .single();
      if (error || !data) {
        alert("No pudimos guardar tu respuesta. Proba de nuevo.");
        return;
      }
      pid = data.id as string;
      sessionStorage.setItem(`cuadrante_pid_${id}`, pid as string);
      setMyPid(pid as string);
    } else {
      await supabase
        .from("participants")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", pid);
    }
    setEditing(false);
    load();
  }

  function shareWhatsApp() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const msg = `${TYPE_LABEL[event!.type]} ${event!.title}\n${fmtDate(event!.starts_at)}${
      event!.location ? " \u00B7 " + event!.location : ""
    }${event!.price ? " \u00B7 $" + event!.price : ""}\n\nConfirma aca \u{1F449} ${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }

  async function cancelEvent() {
    const ok = confirm(
      "Seguro que queres cancelar el evento? Los confirmados van a ver que se cancelo."
    );
    if (!ok) return;
    await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  return (
    <>
      <div className="scoreboard px-6 pt-8 pb-7">
        <Link href="/" className="font-mono text-xs opacity-60 uppercase tracking-widest">
          {"\u2190"} Cuadrante
        </Link>
        <p className="font-mono text-xs opacity-70 mt-3">{TYPE_LABEL[event.type]}</p>
        <h1 className="font-display text-2xl font-semibold mt-1 leading-tight">{event.title}</h1>
        <p className="text-sm opacity-80 mt-2">
          {fmtDate(event.starts_at)}
          {event.location ? ` \u00B7 ${event.location}` : ""}
        </p>
        {event.price ? <p className="text-sm opacity-80">${event.price}</p> : null}

        {!isCancelled && (
          <div className="mt-6">
            <p className="font-mono text-4xl font-semibold">
              {going.length}
              {event.max_slots ? ` / ${event.max_slots}` : ""}
            </p>
            <p className="font-mono text-xs opacity-60 uppercase tracking-widest mt-1">
              {event.max_slots
                ? isFull
                  ? "Evento completo"
                  : `Faltan ${event.max_slots - going.length}`
                : "Confirmados"}
            </p>
          </div>
        )}
      </div>

      <div className="px-6 pt-6">
        {isCancelled ? (
          <div className="bg-notgoing/10 border border-notgoing rounded-xl p-4 text-center">
            <p className="font-display font-semibold text-notgoing">Este evento fue cancelado</p>
          </div>
        ) : !mine || editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => respond("going")}
                disabled={isFull}
                className="btn-press rounded-xl py-4 font-display font-semibold text-white bg-going disabled:opacity-40"
              >
                {"\u2705"} Voy
              </button>
              <button
                onClick={() => respond("not_going")}
                className="btn-press rounded-xl py-4 font-display font-semibold text-white bg-notgoing"
              >
                {"\u274C"} No voy
              </button>
            </div>
            {isFull && (
              <button
                onClick={() => respond("waitlist")}
                className="btn-press w-full mt-3 rounded-xl py-3 border border-gold text-ink font-display font-medium"
              >
                Entrar como suplente
              </button>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-4 card flex items-center justify-between">
            <p className="text-sm">
              Tu estado:{" "}
              <b>
                {mine.status === "going"
                  ? "\u{1F7E2} Voy"
                  : mine.status === "not_going"
                  ? "\u{1F534} No voy"
                  : "\u{1F7E1} Suplente"}
              </b>
            </p>
            <button
              onClick={() => setEditing(true)}
              className="font-mono text-xs underline text-gray-500"
            >
              Cambiar
            </button>
          </div>
        )}

        {!isCancelled && (
          <button
            onClick={shareWhatsApp}
            className="btn-press w-full mt-4 rounded-xl py-3 bg-[#25D366] text-white font-display font-semibold text-sm"
          >
            Compartir por WhatsApp
          </button>
        )}

        <div className="flex gap-3 mt-3">
          {!isCancelled && isOwner && (
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-press flex-1 rounded-xl py-3 border border-gray-300 text-ink font-display font-medium text-sm"
            >
              Editar
            </button>
          )}
          {!isCancelled && isOwner && (
            <button
              onClick={cancelEvent}
              className="btn-press flex-1 rounded-xl py-3 border border-notgoing text-notgoing font-display font-medium text-sm"
            >
              Cancelar evento
            </button>
          )}
        </div>

        <div className="mt-7 space-y-4 pb-10">
          <ParticipantGroup label={"\u{1F7E2} Van"} list={going} />
          <ParticipantGroup label={"\u{1F7E1} Pendientes"} list={pending} muted />
          <ParticipantGroup label={"\u{1F534} No van"} list={notGoing} muted />
          <ParticipantGroup label={"\u23F3 Lista de espera"} list={waitlist} muted />
        </div>
      </div>

      {showEditModal && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            load();
          }}
        />
      )}
    </>
  );
}

function ParticipantGroup({
  label,
  list,
  muted
}: {
  label: string;
  list: ParticipantRow[];
  muted?: boolean;
}) {
  if (!list.length) return null;
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">
        {label} ({list.length})
      </p>
      {list.map((p) => (
        <p key={p.id} className={`text-sm py-1 ${muted ? "text-gray-500" : ""}`}>
          {p.name}
        </p>
      ))}
    </div>
  );
}

function EditEventModal({
  event,
  onClose,
  onSaved
}: {
  event: EventRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  function toLocalInputValue(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const maxSlots = fd.get("maxSlots");
    const price = fd.get("price");

    const { error } = await supabase
      .from("events")
      .update({
        type: fd.get("type") as EventType,
        title: fd.get("title") as string,
        starts_at: new Date(fd.get("startsAt") as string).toISOString(),
        location: (fd.get("location") as string) || null,
        max_slots: maxSlots ? parseInt(maxSlots as string) : null,
        price: price ? parseInt(price as string) : null
      })
      .eq("id", event.id);

    setSaving(false);
    if (error) {
      alert("Hubo un problema guardando los cambios: " + error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Editar evento</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Tipo</label>
            <select
              name="type"
              defaultValue={event.type}
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            >
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Titulo</label>
            <input
              name="title"
              required
              defaultValue={event.title}
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Fecha y hora</label>
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={toLocalInputValue(event.starts_at)}
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Lugar</label>
            <input
              name="location"
              defaultValue={event.location || ""}
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-mono uppercase text-gray-400">Cupos (opcional)</label>
              <input
                name="maxSlots"
                type="number"
                min={1}
                defaultValue={event.max_slots || ""}
                className="w-full border border-gray-200 rounded-lg p-3 mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono uppercase text-gray-400">Precio (opcional)</label>
              <input
                name="price"
                type="number"
                min={0}
                defaultValue={event.price || ""}
                className="w-full border border-gray-200 rounded-lg p-3 mt-1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-press w-full bg-ink text-white rounded-xl py-4 font-display font-semibold mt-2 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
