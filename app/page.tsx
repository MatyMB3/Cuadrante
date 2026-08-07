"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { EventRow, EventType, TYPE_LABEL, fmtDate } from "@/lib/types";

export default function HomePage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [events, setEvents] = useState<(EventRow & { going_count: number })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      ensureOrganizerRow(session).then(loadEvents);
    } else if (session === null) {
      setLoadingEvents(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function ensureOrganizerRow(s: Session) {
    await supabase
      .from("organizers")
      .upsert({ id: s.user.id, email: s.user.email }, { onConflict: "id" });
  }

  async function loadEvents() {
    if (!session) return;
    setLoadingEvents(true);
    const { data: evs } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", session.user.id)
      .order("starts_at", { ascending: true });

    if (evs) {
      const withCounts = await Promise.all(
        evs.map(async (ev) => {
          const { count } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", ev.id)
            .eq("status", "going");
          return { ...ev, going_count: count || 0 };
        })
      );
      setEvents(withCounts as any);
    }
    setLoadingEvents(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setEvents([]);
  }

  if (session === undefined) {
    return <div className="p-6 text-sm text-gray-400">Cargando...</div>;
  }

  if (!session) {
    return (
      <div className="scoreboard px-6 pt-10 pb-10 flex-1 flex flex-col justify-center">
        <p className="font-mono text-xs tracking-[0.25em] uppercase opacity-70">Cuadrante</p>
        <h1 className="font-display text-3xl font-semibold mt-2 leading-tight">
          Quien<br />juega?
        </h1>
        <p className="text-sm opacity-70 mt-3">
          Crea el evento, compartilo por WhatsApp,
          <br />
          mira quien confirma. Nada mas.
        </p>
        <Link
          href="/login"
          className="btn-press mt-6 w-full bg-white text-ink rounded-xl py-4 font-display font-semibold text-center"
        >
          Iniciar sesion para organizar
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="scoreboard px-6 pt-10 pb-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.25em] uppercase opacity-70">Cuadrante</p>
          <button
            onClick={handleLogout}
            className="font-mono text-[10px] uppercase tracking-widest opacity-60 underline"
          >
            Cerrar sesion
          </button>
        </div>
        <h1 className="font-display text-3xl font-semibold mt-2 leading-tight">
          Quien<br />juega?
        </h1>
        <p className="text-sm opacity-70 mt-3">{session.user.email}</p>
      </div>

      <div className="px-6 -mt-5">
        <button
          onClick={() => setShowForm(true)}
          className="btn-press w-full bg-ink text-white rounded-xl py-4 font-display font-semibold text-base card transition-transform"
        >
          + Crear evento
        </button>
      </div>

      <div className="px-6 mt-8 pb-10 flex-1">
        <p className="font-mono text-xs tracking-widest uppercase text-gray-400 mb-3">
          {loadingEvents ? "Cargando..." : events.length ? "Mis eventos" : "Todavia no hay eventos"}
        </p>
        <div className="space-y-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/e/${ev.id}`}
              className="btn-press block bg-white rounded-xl p-4 card flex items-center justify-between transition-transform"
            >
              <div>
                <p className="text-xs text-gray-400 font-mono">{TYPE_LABEL[ev.type]}</p>
                <p className="font-semibold font-display">{ev.title}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtDate(ev.starts_at)}</p>
              </div>
              <div className="text-right font-mono">
                <p className="text-lg font-semibold text-field">
                  {ev.going_count}{ev.max_slots ? `/${ev.max_slots}` : ""}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {ev.status === "cancelled" ? "cancelado" : ev.status === "full" ? "completo" : "confirmados"}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {!loadingEvents && events.length === 0 && (
          <p className="text-sm text-gray-400 mt-2">Crea el primero y compartilo por WhatsApp.</p>
        )}
      </div>

      {showForm && (
        <CreateEventModal
          organizerId={session.user.id}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadEvents();
          }}
        />
      )}
    </>
  );
}

function CreateEventModal({
  organizerId,
  onClose,
  onCreated
}: {
  organizerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const maxSlots = fd.get("maxSlots");
    const price = fd.get("price");

    const { data: newEvent, error } = await supabase
      .from("events")
      .insert({
        organizer_id: organizerId,
        type: fd.get("type") as EventType,
        title: fd.get("title") as string,
        starts_at: new Date(fd.get("startsAt") as string).toISOString(),
        location: (fd.get("location") as string) || null,
        max_slots: maxSlots ? parseInt(maxSlots as string) : null,
        price: price ? parseInt(price as string) : null,
        status: "open"
      })
      .select()
      .single();

    setSaving(false);
    if (error || !newEvent) {
      alert("Hubo un problema creando el evento: " + error?.message);
      return;
    }

    await createReminders(newEvent.id, newEvent.starts_at);
    onCreated();
  }

  async function createReminders(eventId: string, startsAt: string) {
    const start = new Date(startsAt).getTime();
    const rows = [
      { event_id: eventId, type: "t24h", scheduled_for: new Date(start - 24 * 60 * 60 * 1000).toISOString() },
      { event_id: eventId, type: "t6h", scheduled_for: new Date(start - 6 * 60 * 60 * 1000).toISOString() },
      { event_id: eventId, type: "t2h", scheduled_for: new Date(start - 2 * 60 * 60 * 1000).toISOString() }
    ];
    await supabase.from("reminders").insert(rows);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Nuevo evento</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Tipo</label>
            <select name="type" className="w-full border border-gray-200 rounded-lg p-3 mt-1">
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
              placeholder="Futbol 5 de los jueves"
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Fecha y hora</label>
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="w-full border border-gray-200 rounded-lg p-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Lugar</label>
            <input
              name="location"
              placeholder="Cancha Norte"
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
                placeholder="10"
                className="w-full border border-gray-200 rounded-lg p-3 mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono uppercase text-gray-400">Precio (opcional)</label>
              <input
                name="price"
                type="number"
                min={0}
                placeholder="3000"
                className="w-full border border-gray-200 rounded-lg p-3 mt-1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-press w-full bg-ink text-white rounded-xl py-4 font-display font-semibold mt-2 disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear evento"}
          </button>
        </form>
      </div>
    </div>
  );
}
