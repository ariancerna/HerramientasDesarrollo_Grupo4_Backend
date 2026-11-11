# Recuperar contraseña (AUTH-07 / AUTH-08 / AUTH-09)

## Flujo

1. **AUTH-07** `POST /api/v1/auth/password/forgot { correo }` — si el correo pertenece a una cuenta activa, se genera un código de 6 dígitos (vence en 10 minutos) y se envía por correo. La respuesta es siempre la misma, exista o no la cuenta. Hay un tiempo de espera de 30 s entre envíos al mismo correo.
2. **AUTH-08** `POST /api/v1/auth/password/verify { correo, codigo }` — valida el código (máximo 5 intentos; luego hay que pedir otro) y devuelve un `resetToken` de 10 minutos.
3. **AUTH-09** `POST /api/v1/auth/password/reset { resetToken, nuevaPassword }` — cambia la contraseña en Supabase Auth y anula el token y los códigos pendientes.

El correo se normaliza (sin espacios, en minúsculas), así que `Ana@Gmail.com` y `ana@gmail.com` son la misma cuenta. Si el proveedor de correo falla, el código se anula y la API responde 502 para que el usuario pueda reintentar de inmediato.

## Proveedor de correo

Railway bloquea el SMTP saliente en sus planes gratuitos, por eso el envío usa la API HTTP de **Brevo** o de **Resend**.

### Opción A: Brevo (recomendada, gratis 300 correos/día, envía a cualquier correo)

1. Crea una cuenta en https://www.brevo.com.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: agrega tu correo (por ejemplo tu Gmail) y confírmalo desde el enlace que te llega.
3. **SMTP & API → API Keys → Generate a new API key**.
4. En Railway (y en tu `.env` local):
   ```
   BREVO_API_KEY=xkeysib-...
   CORREO_REMITENTE=el-correo-que-verificaste@gmail.com
   CORREO_REMITENTE_NOMBRE=El Golazo Club
   ```

### Opción B: Resend

`RESEND_API_KEY=re_...`. Sin un dominio propio verificado, Resend solo entrega correos a la dirección con la que creaste la cuenta (remitente `onboarding@resend.dev`).

### Sin proveedor

En desarrollo (`NODE_ENV=development`) el código se imprime en la consola del backend. En producción la API responde 503 indicando que el envío de correos no está configurado.
