import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getAdminSupabase } from "@/lib/supabaseAdmin";

webpush.setVapidDetails(
  "mailto:soporte@cuadrante.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

const LABELS: Record<string, string> = {
  t24h: "manana",
  t6h: "en unas horas",
  t2h: "pronto"
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();
  const graceStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // no mandar avisos de mas de 2hs de atraso

  const { data: dueReminders, error } = await supabase
    .from("reminders")
    .select("*, events(*)")
    .eq("sent", false)
    .lte("scheduled_for", now.toISOString())
    .gte("scheduled_for", graceStart.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notified = 0;

  for (const reminder of dueReminders || []) {
    const event = (reminder as any).events;
    if (!event || event.status === "cancelled") {
      await supabase.from("reminders").update({ sent: true }).eq("id", reminder.id);
      continue;
    }

    const { data: pendingParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("status", "pending");

    for (const p of pendingParticipants || []) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("participant_id", p.id);

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify({
              title: event.title,
              body: `Todavia no respondiste. El evento es ${LABELS[reminder.type] || ""}.`,
              url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/e/${event.id}`
            })
          );
          notified++;
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    await supabase.from("reminders").update({ sent: true }).eq("id", reminder.id);
  }

  return NextResponse.json({ ok: true, remindersProcessed: dueReminders?.length || 0, notified });
}
