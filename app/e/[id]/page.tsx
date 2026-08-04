"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { EventRow, ParticipantRow, TYPE_LABEL, fmtDate } from "@/lib/types";

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [myPid, setMyPid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    load();
  }

  function shareWhatsApp() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const msg = `${TYPE_LABEL[event!.type]} ${event!.title}\n${fmtDate(event!.starts_at)}${
      event!.location ? " Â· " + event!.location : ""
    }${event!.price ? " Â· $" + event!.price : ""}\n\nConfirma aca ðŸ‘‰ ${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }

  return (
    <>
      <div className="scoreboard px-6 pt-8 pb-7">
        <Link href="/" className="font-mono text-xs opacity-60 uppercase tracking-widest">
          â† Cuadrante
        </Link>
        <p className="font-mono text-xs opacity-70 mt-3">{TYPE_LABEL[event.type]}</p>
        <h1 className="font-display text-2xl font-semibold mt-1 leading-tight">{event.title}</h1>
        <p className="text-sm opacity-80 mt-2">
          {fmtDate(event.starts_at)}
          {event.location ? ` Â· ${event.location}` : ""}
        </p>
        {event.price ? <p className="text-sm opacity-80">${event.price}</p> : null}

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
      </div>

      <div className="px-6 pt-6">
        {!mine ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => respond("going")}
                disabled={isFull}
                className="btn-press rounded-xl py-4 font-display font-semibold text-white bg-going disabled:opacity-40"
              >
                âœ… Voy
              </button>
              <button
                onClick={() => respond("not_going")}
                className="btn-press rounded-xl py-4 font-display font-semibold text-white bg-notgoing"
              >
                âŒ No voy
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
                  ? "ðŸŸ¢ Voy"
                  : mine.status === "not_going"
                  ? "ðŸ”´ No voy"
                  : "ðŸŸ¡ Suplente"}
              </b>
            </p>
            <button
              onClick={() => {
                setMyPid(null);
                sessionStorage.removeItem(`cuadrante_pid_${id}`);
              }}
              className="font-mono text-xs underline text-gray-500"
            >
              Cambiar
            </button>
          </div>
        )}

        <button
          onClick={shareWhatsApp}
          className="btn-press w-full mt-4 rounded-xl py-3 bg-[#25D366] text-white font-display font-semibold text-sm"
        >
          Compartir por WhatsApp
        </button>

        <div className="mt-7 space-y-4 pb-10">
          <ParticipantGroup label="ðŸŸ¢ Van" list={going} />
          <ParticipantGroup label="ðŸŸ¡ Pendientes" list={pending} muted />
          <ParticipantGroup label="ðŸ”´ No van" list={notGoing} muted />
          <ParticipantGroup label="â³ Lista de espera" list={waitlist} muted />
        </div>
      </div>
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
