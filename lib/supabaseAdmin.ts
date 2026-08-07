import { createClient } from "@supabase/supabase-js";

// OJO: este cliente usa la clave "service role", que se salta todas las
// protecciones de seguridad (RLS). Nunca se usa en el navegador, solo
// dentro de rutas de servidor como /api/cron/reminders.
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(url, serviceKey);
}
