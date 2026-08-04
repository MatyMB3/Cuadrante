# Cuadrante

MVP de organización de eventos deportivos entre amigos. Ver el documento de producto para el detalle completo de arquitectura, roadmap y modelo de datos.

## Variables de entorno necesarias (configurar en Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_ORGANIZER_ID`

## Antes de desplegar

1. Ejecutar `schema.sql` en el SQL Editor de Supabase.
2. Insertar un organizador por defecto:
   ```sql
   insert into organizers (email, name) values ('organizador@cuadrante.app', 'Organizador principal') returning id;
   ```
   Copiar el `id` devuelto y usarlo como `NEXT_PUBLIC_DEFAULT_ORGANIZER_ID`.
3. En Supabase, ir a Database > Replication y habilitar la tabla `participants` para Realtime (así los cupos se actualizan en vivo sin recargar la página).
