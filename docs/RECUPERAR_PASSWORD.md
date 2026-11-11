# Recuperar contraseña (AUTH-07 / AUTH-08 / AUTH-09)

## Flujo

1. **AUTH-07** `POST /api/v1/auth/password/forgot { correo }` — si el correo pertenece a una cuenta activa, se genera un código de 6 dígitos (vence en 10 minutos) y se envía por correo. La respuesta es siempre la misma, exista o no la cuenta. Hay un tiempo de espera de 30 s entre envíos al mismo correo.
2. **AUTH-08** `POST /api/v1/auth/password/verify { correo, codigo }` — valida el código (máximo 5 intentos; luego hay que pedir otro) y devuelve un `resetToken` de 10 minutos.
3. **AUTH-09** `POST /api/v1/auth/password/reset { resetToken, nuevaPassword }` — cambia la contraseña en Supabase Auth y anula el token y los códigos pendientes.

El correo se normaliza (sin espacios, en minúsculas), así que `Ana@Gmail.com` y `ana@gmail.com` son la misma cuenta. Si el proveedor de correo falla, el código se anula y la API responde 502 para que el usuario pueda reintentar de inmediato.

## ¿Quién envía el correo?

| Configuración del backend | Quién genera y envía el código |
|---|---|
| Sin `BREVO_API_KEY` ni `RESEND_API_KEY` (por defecto) | **Supabase Auth**, con el SMTP configurado en el proyecto (por ejemplo Gmail). |
| Con `BREVO_API_KEY` o `RESEND_API_KEY` | El backend genera el código y lo envía por la API HTTP de Brevo o Resend. |

> Railway bloquea el SMTP saliente en los planes Free/Trial/Hobby, por eso el backend nunca se conecta a `smtp.gmail.com`. Con la opción A quien se conecta es Supabase.

### Opción A: Gmail desde Supabase (recomendada)

1. **Contraseña de aplicación de Gmail**: activa la verificación en dos pasos en tu cuenta de Google y crea una contraseña de aplicación en https://myaccount.google.com/apppasswords (son 16 letras).
2. **Supabase → Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Sender email: tu Gmail · Sender name: `El Golazo Club`
   - Host: `smtp.gmail.com` · Port: `465` · Username: tu Gmail · Password: la contraseña de aplicación
3. **Supabase → Authentication → Emails → Templates → Reset Password**: el correo debe mostrar el código `{{ .Token }}` (la plantilla por defecto solo trae un enlace). Asunto sugerido: `Tu código para recuperar tu contraseña`. Cuerpo:
   ```html
   <h2>Recuperar contraseña</h2>
   <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en El Golazo Club.</p>
   <p>Ingresa este código en la pantalla de recuperación:</p>
   <p style="font-size:32px;font-weight:bold;letter-spacing:8px">{{ .Token }}</p>
   <p>El código vence en 10 minutos. Si no pediste cambiar tu contraseña, ignora este correo.</p>
   ```
4. **Supabase → Authentication → Sign In / Providers → Email**: *Email OTP Length* = `6` y *Email OTP Expiration* = `600` segundos (10 minutos).
5. (Opcional) **Authentication → Rate Limits**: sube "emails sent per hour" si harán muchas pruebas.

Supabase solo permite pedir un código por correo cada 60 segundos; antes de eso la API responde 429.

### Opción B: Brevo (API HTTP)

1. Crea una cuenta en https://www.brevo.com y verifica tu correo remitente en **Senders, Domains & Dedicated IPs → Senders**.
2. **SMTP & API → API Keys → Generate a new API key**.
3. En Railway: `BREVO_API_KEY=xkeysib-...`, `CORREO_REMITENTE=tu-correo-verificado`, `CORREO_REMITENTE_NOMBRE=El Golazo Club`.

### Opción C: Resend

`RESEND_API_KEY=re_...`. Sin un dominio propio verificado, Resend solo entrega correos a la dirección con la que creaste la cuenta (remitente `onboarding@resend.dev`).
