# Cuentas Claras

Control de gastos del hogar por chat, para dos (o los que quieran). Le cuentas
lo que compraste —o le mandas la foto de la factura— y la IA lo va anotando en
el resumen del mes.

👉 **Para ponerla a andar: [SETUP.md](./SETUP.md)** (los usuarios y la base ya
están listos; sólo falta la API key de Gemini y desplegar).

## Cómo funciona

**Entras con un usuario, no con un correo.** Las cuentas se crean a mano en
Supabase (ver SETUP.md): no hay registro, ni Google, ni correos de
confirmación. Escribes tu usuario y tu contraseña y entras.

**Salas para compartir.** Ya dentro, creas una sala y te da un ID de 8
caracteres tipo `KRPD-7M4X`. Se lo pasas a tu pareja junto con la contraseña de
la sala y ya está. Pueden entrar cuantas personas quieran, cada una con su
apodo, y cada gasto queda a nombre de quien lo registró.

**Chateas, no llenas formularios.** "mercado en el D1 320mil", "uber 18k",
"me pagaron la quincena 2 palos". Entiende la jerga colombiana (mil, k, luca,
palo) y también preguntas: "¿cuánto llevamos en antojos este mes?".

**Facturas por foto.** Le mandas la foto y saca el total, la categoría y el
comercio. Si la factura mezcla cosas muy distintas, la parte en varios
movimientos.

**En vivo.** Si tu pareja anota algo desde su celular, te aparece en el tuyo al
instante.

**Nunca se queda callada.** Si Gemini se cae o se acaba la cuota, un parser
local sigue registrando los gastos escritos.

## Las pantallas

- **Chat** — anotar, preguntar, corregir. Arriba, cuánto llevan y cuánto queda.
- **Estadísticas** — mensual, trimestral, semestral, anual o un rango a mano.
  Por categoría, por persona, tendencia y el detalle movimiento por movimiento
  (con botón para borrar lo que la IA entendió mal).
- **Configuración** — el ID para invitar, nómina, tope de gasto, apodo, fondo
  del chat, modo oscuro, cada cuánto se borran las fotos, y tu contraseña de
  entrada.

## Nómina y tope

La **nómina** es lo que esperan que entre al mes. Si además registran el pago
por el chat ("me pagaron la quincena"), esa manda sobre la configurada: así la
misma plata no se cuenta dos veces. Los ingresos **extra** (freelance, ventas,
bonos) sí se suman encima.

Al mirar un trimestre o un año, la nómina y el tope se multiplican por los
meses del periodo para que la comparación signifique algo.

## Cómo está armado

| Capa | Qué hay |
| --- | --- |
| `components/login-screen.tsx` | Entrada con usuario y contraseña |
| `app/page.tsx` | Estado de la sala, sincronización en vivo, envío al bot |
| `app/api/chat/` | Gemini. La API key nunca sale del servidor |
| `lib/finance.ts` | Categorías, periodos, agregaciones y el parser de respaldo |
| `lib/gemini.ts` | El cliente de la IA, aislado: cambiar de modelo o proveedor se hace aquí |
| `lib/room.ts` | Todo el acceso a Supabase |
| `lib/image.ts` | Compresión de facturas en el navegador |
| `components/` | Las tres pantallas |

Stack: Next.js 16 · React 19 · Tailwind 4 · Supabase (Postgres + RLS + Storage
+ Realtime) · Gemini Flash-Lite.

## Seguridad

- Las contraseñas (la tuya y la de la sala) se guardan con bcrypt, nunca en
  texto plano.
- RLS en todas las tablas: quien no es miembro de una sala no ve ni una fila.
  Verificado con pruebas contra la base real.
- El bucket de facturas es privado; las imágenes se sirven con URLs firmadas
  que caducan.
- La API key de Gemini vive sólo en el servidor.
- 10 intentos fallidos por hora al entrar a una sala.

## Desarrollo

```bash
pnpm install
pnpm dev
```
