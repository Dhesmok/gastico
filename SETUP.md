# Puesta en marcha

Todo el proyecto corre en planes gratuitos.

La base de datos y los usuarios **ya quedaron creados**: no hay que tocar nada
en el panel de Supabase. Lo único que falta de verdad es la API key de Gemini
(paso 2) y poner las variables donde va a correr (paso 3).

---

## 1. Supabase

La base de datos ya está creada y migrada en el proyecto
`imsknquotsqjwxqjciov`. **No hay que tocar nada en el panel.**

### Los usuarios ya están creados

No hay registro ni correos: los usuarios se crean a mano y sólo se entra. Estos
dos ya existen:

| Usuario | Contraseña temporal |
| --- | --- |
| `fabio` | `cuentas.7412` |
| `pareja` | `cuentas.9358` |

**Cámbialas apenas entren**, desde la app: *Configuración → Mi cuenta → Cambiar
mi contraseña*.

Por dentro, la app le pega el dominio `@gastico.app` al usuario (`fabio` pasa a
ser `fabio@gastico.app`), pero eso nunca se ve ni se escribe. Ese correo no
existe ni recibe nada: es sólo la forma en que Supabase identifica la cuenta.

### Añadir una tercera persona

Dos formas.

**Desde el panel:** *Authentication → Users → Add user*. El correo debe
terminar en `@gastico.app` (por ejemplo `mama@gastico.app`), y hay que marcar
**"Auto Confirm User"**.

**Desde el editor SQL** (*SQL Editor → New query*), cambiando el usuario y la
clave de la primera línea:

```sql
do $$
declare
  v_usuario constant text := 'mama';
  v_clave   constant text := 'una-clave-buena';
  v_uid uuid := gen_random_uuid();
  v_mail text := v_usuario || '@gastico.app';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_mail, extensions.crypt(v_clave, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );
  insert into auth.identities (
    user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    v_uid, 'email', v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_mail,
                       'email_verified', true, 'phone_verified', false),
    now(), now(), now()
  );
end $$;
```

Después, esa persona entra con su usuario y se une a la sala con el ID y la
contraseña de la sala.

### Dos contraseñas distintas (no las confundas)

| Cuál | Para qué | Quién la sabe |
| --- | --- | --- |
| **Tu contraseña** | Entrar a la app | Sólo tú |
| **Contraseña de la sala** | Unirse a la sala compartida | La compartes con tu pareja |

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

Las contraseñas **nunca** se guardan en texto plano: se almacena el hash bcrypt
y la comparación ocurre del lado del servidor.

---

## 2. Gemini

Saca una API key gratis en <https://aistudio.google.com/apikey>.

La key vive **sólo en el servidor** (`app/api/chat/route.ts`). El navegador
nunca la ve, así que nadie puede sacarla del código.

### Qué modelo usa

Por defecto **`gemini-3.1-flash-lite`**. Si tu key no tiene acceso a ese
modelo, o Google le cambia el nombre, la app prueba sola con `gemini-2.5-flash`
y luego con `gemini-2.0-flash`. No hay que hacer nada.

Para forzar otro modelo, añade la variable `GEMINI_MODEL` con el nombre que
quieras: manda sobre el valor por defecto.

Ten en cuenta que **flash-lite es el modelo más liviano**: con texto va
perfecto, pero leyendo fotos de facturas se equivoca más que `flash`. Si notas
que las facturas salen mal, pon `GEMINI_MODEL=gemini-3.1-flash` (o
`gemini-2.5-flash`) y listo, sin tocar código.

> Ojo: en el plan gratuito de Google, lo que le mandes puede usarse para
> entrenar sus modelos. Para las cuentas del mercado no es grave, pero vale la
> pena saberlo.

### Si algo falla

La respuesta del bot incluye qué modelo contestó, y el servidor deja un aviso
en los logs de Vercel cuando tuvo que usar uno de respaldo. Así se sabe qué
pasó sin adivinar.

**Si Gemini falla del todo** (se acabó la cuota, se cayó, no hay key), la app
no se queda muda: un parser local en `lib/finance.ts` entiende "mercado 120mil",
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
