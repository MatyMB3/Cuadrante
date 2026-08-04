"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, DEFAULT_ORGANIZER_ID } from "@/lib/supabase";
import { EventRow, EventType, TYPE_LABEL, fmtDate } from "@/lib/types";

export default function HomePage() {
  const [events, setEvents] = useState<(EventRow & { going_count: number })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    setLoading(true);
    const { data: evs } = await supabase
      .from("events")
      .select("*")
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
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <>
      <div className="scoreboard px-6 pt-10 pb-8">
        <p className="font-mono text-xs tracking-[0.25em] uppercase opacity-70">Cuadrante</p>
        <h1 className="font-display text-3xl font-semibold mt-2 leading-tight">
          ¿Quién<br />juega?
        </h1>
        <p className="text-sm opacity-70 mt-3">
          Creá el evento, compartilo por WhatsApp,<br />mirá quién confirma. Nada más.
        </p>
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
          {loading ? "Cargando..." : events.length ? "Eventos" : "Todavía no hay eventos"}
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
                  {ev.status === "full" ? "completo" : "confirmados"}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {!loading && events.length === 0 && (
          <p className="text-sm text-gray-400 mt-2">Creá el primero y compartilo por WhatsApp.</p>
        )}
      </div>

      {showForm && (
        <CreateEventModal
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
  onClose,
  onCreated
}: {
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

    const { error } = await supabase.from("events").insert({
      organizer_id: DEFAULT_ORGANIZER_ID,
      type: fd.get("type") as EventType,
      title: fd.get("title") as string,
      starts_at: new Date(fd.get("startsAt") as string).toISOString(),
      location: (fd.get("location") as string) || null,
      max_slots: maxSlots ? parseInt(maxSlots as string) : null,
      price: price ? parseInt(price as string) : null,
      status: "open"
    });

    setSaving(false);
    if (error) {
      alert("Hubo un problema creando el evento: " + error.message);
      return;
    }
    onCreated();
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
            <label className="text-xs font-mono uppercase text-gray-400">Título</label>
            <input
              name="title"
              required
              placeholder="Fútbol 5 de los jueves"
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
