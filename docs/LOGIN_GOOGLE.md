# Inicio de sesión con Google (AUTH-12 / AUTH-13)

## Flujo

1. El front llama `GET /api/v1/auth/google/url?redirectTo=<front>/auth/callback` y redirige al navegador a la URL devuelta.
2. El usuario elige su cuenta de Google; Google vuelve a Supabase y Supabase vuelve a `<front>/auth/callback#access_token=...&refresh_token=...`.
3. El front envía `POST /api/v1/auth/google { accessToken, refreshToken }`.
4. El backend decide qué cuenta del club corresponde al correo de Google:

| Caso | Resultado |
|------|-----------|
| El correo ya tiene cuenta (admin, profesor o alumno) | Supabase vincula Google a esa misma cuenta y entra con su rol. |
| Alumno activo inscrito con ese correo, sin cuenta | Se crea su cuenta automáticamente (usuario tomado del correo). |
| Correo que no pertenece al club | 403; se elimina el usuario que Supabase creó al entrar con Google. |
| Cuenta deshabilitada | 403 y se revoca la sesión. |

## Configuración (una sola vez)

### Google Cloud Console
1. APIs y servicios → Pantalla de consentimiento OAuth → tipo **Externo**, nombre de la app y correo de soporte. Agrega tu correo en **Usuarios de prueba** mientras la app esté en modo de prueba.
2. Credenciales → Crear credenciales → **ID de cliente de OAuth** → tipo **Aplicación web**.
3. En **URI de redireccionamiento autorizados** pega la *Callback URL* que muestra Supabase: `https://<proyecto>.supabase.co/auth/v1/callback`.
4. Copia el **Client ID** y el **Client Secret**.

### Supabase
1. Authentication → Sign In / Providers → **Google** → activar, pegar Client ID y Client Secret → Save.
2. Authentication → URL Configuration → **Redirect URLs**: agregar
   - `http://localhost:3000/auth/callback`
   - `https://voleyclub.vercel.app/auth/callback` (o el dominio del front en Vercel)

No hace falta ninguna variable de entorno nueva en el backend ni en el front.
