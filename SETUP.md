# Puesta en marcha

Todo el proyecto corre en planes gratuitos. Son cuatro pasos.

---

## 1. Supabase

La base de datos ya está creada y migrada en el proyecto
`imsknquotsqjwxqjciov`. Sólo falta **un interruptor que hay que activar a
mano**, porque la API no lo permite:

> **Authentication → Sign In / Providers → Anonymous sign-ins → Enable**

### ¿Por qué sesiones anónimas?

Tú pediste salas con ID + contraseña y sin usuarios visibles: nada de correos
ni de "iniciar sesión con Google". Pero las reglas de seguridad de Postgres
(RLS) necesitan saber *quién* es cada quien para que la sala A no vea los
gastos de la sala B.

La sesión anónima resuelve las dos cosas: al abrir la app, el dispositivo
recibe una identidad real de Supabase de forma invisible (sin pedir nada), y
sobre esa identidad se monta la membresía de la sala. La contraseña de verdad
—la que decide quién entra— sigue siendo la de la sala.

Si el interruptor está apagado, la app lo dice con todas sus letras en la
pantalla de inicio en vez de fallar en silencio.

### Lo que ya quedó creado

| Tabla | Para qué |
| --- | --- |
| `rooms` | La sala: código, contraseña (hasheada con bcrypt), nómina, tope, preferencias |
| `room_members` | Quién pertenece a cada sala y con qué apodo |
| `expenses` | Gastos e ingresos |
| `messages` | El historial del chat |
| `join_attempts` | Freno a la fuerza bruta: 10 intentos fallidos por hora |

Funciones (`SECURITY DEFINER`, con `search_path` fijo):
`create_room`, `join_room`, `set_room_password`, `is_room_member`.

Seguridad: RLS activo en todas las tablas. Un miembro sólo ve las filas de
*sus* salas; alguien de fuera no ve absolutamente nada. Está verificado con
pruebas contra la base real, incluyendo el caso del extraño que intenta leer
una sala ajena.

La contraseña de la sala **nunca** se guarda en texto plano: se almacena el
hash bcrypt y `join_room` lo compara del lado del servidor.

---

## 2. Gemini

Saca una API key gratis en <https://aistudio.google.com/apikey>.

La key vive **sólo en el servidor** (`app/api/chat/route.ts`). El navegador
nunca la ve, así que nadie puede sacarla del código.

Por defecto usa `gemini-2.5-flash` y, si esa no está disponible para tu key,
cae automáticamente a `gemini-2.0-flash`.

> Ojo: en el plan gratuito de Google, lo que le mandes puede usarse para
> entrenar sus modelos. Para las cuentas del mercado no es grave, pero vale la
> pena saberlo.

**Si Gemini falla** (se acabó la cuota, se cayó, no hay key), la app no se
queda muda: un parser local en `lib/finance.ts` entiende "mercado 120mil",
"uber 18k", "2 palos" y registra el gasto igual. Lo único que se pierde
mientras tanto es la lectura de facturas por foto.

---

## 3. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://imsknquotsqjwxqjciov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dDLNEOjgqXo5SN1Pw_TEgQ_KadXDEFE
GEMINI_API_KEY=tu-api-key-de-gemini
```

En Vercel, las mismas tres en **Settings → Environment Variables**.

La `anon key` es pública por diseño (va en el navegador); lo que protege los
datos es RLS, no esa llave.

---

## 4. Correr

```bash
pnpm install
pnpm dev
```

---

## Sobre el Drive: por qué no hace falta

Preguntaste si convenía guardar cosas en Drive para no llenar Supabase. La
respuesta corta es **no, y te ahorras un montón de enredo**.

Conectar Drive exige un proyecto en Google Cloud, pantalla de consentimiento
OAuth (con verificación de Google si no quieres el aviso de "app no
verificada"), y guardar y renovar tokens en algún servidor. Es bastante
infraestructura para dos personas anotando el mercado.

Y sobre todo: **no se necesita**. Las cuentas ocupan casi nada. Lo único
pesado son las fotos de facturas, y eso ya está resuelto:

1. **Se comprimen en tu celular antes de subirse.** `lib/image.ts` las reduce
   a 1280 px y las pasa a WebP: una foto de 4 MB queda en unos 80 KB, y la
   factura se sigue leyendo perfectamente.
2. **El gigabyte gratis de Supabase da para más de 10.000 facturas.** A dos
   personas eso les dura años.
3. **Se borran solas.** En Configuración eliges cada cuánto (3, 6, 12 meses o
   nunca). Al borrarse se va sólo la imagen: el monto, la categoría y la nota
   se quedan para siempre. Así el espacio nunca crece sin freno.
4. **Puedes no guardarlas.** Hay un interruptor para que la foto sólo pase por
   la IA, se extraiga el total y no ocupe ni un byte.

Con eso, la cuenta de almacenamiento nunca llega ni cerca del límite del plan
gratis.

### Los límites gratis, en números

| Servicio | Límite gratis | Lo que gastarían dos personas |
| --- | --- | --- |
| Supabase base de datos | 500 MB | Un gasto pesa ~200 bytes → años de historia |
| Supabase Storage | 1 GB | ~12.000 facturas comprimidas |
| Supabase transferencia | 5 GB/mes | Muy lejos del límite |
| Gemini Flash | ~1.500 peticiones/día | Imposible de alcanzar entre dos |
| Vercel | 100 GB/mes | Ni se nota |

### El proyecto se pausa solo (y cómo se evita)

Supabase pausa los proyectos gratis tras **7 días sin actividad**. Para que no
les pase justo cuando van a anotar algo, `vercel.json` deja programado un ping
diario a `/api/keepalive` que despierta la base. No cuesta nada y evita el
susto de "el proyecto está pausado".

---

## Cosas que quizá quieras hacer después

- **Instalarla como app en el celular.** Al desplegar en Vercel, abre la web en
  el celular y usa "Añadir a pantalla de inicio". Se ve como una app nativa.
- **Cambiar de moneda.** El campo `currency` de la sala ya existe; hoy la
  interfaz asume COP en los atajos (+100K, +1M).
- **Gastos fijos recurrentes** (arriendo, internet) que se anoten solos cada
  mes.
- **Presupuesto por categoría**, no sólo un tope global.
