import { env } from '../../config/env';
import { ApiError } from '../errors/api-error';

export interface Correo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export interface ConfigCorreo {
  brevoApiKey?: string;
  resendApiKey?: string;
  remitente?: string;
  remitenteNombre: string;
}

export type ProveedorCorreo = 'brevo' | 'resend' | null;

/** Brevo tiene prioridad; sin ninguna llave no hay proveedor configurado. */
export function proveedorConfigurado(config: ConfigCorreo): ProveedorCorreo {
  if (config.brevoApiKey) return 'brevo';
  if (config.resendApiKey) return 'resend';
  return null;
}

/** ¿Hay Brevo o Resend configurado en las variables de entorno? */
export const hayProveedorCorreo = () => proveedorConfigurado(configDesdeEnv()) !== null;

const configDesdeEnv = (): ConfigCorreo => ({
  brevoApiKey: env.brevoApiKey,
  resendApiKey: env.resendApiKey,
  remitente: env.correoRemitente,
  remitenteNombre: env.correoRemitenteNombre,
});

async function detalleError(respuesta: Response) {
  const texto = await respuesta.text().catch(() => '');
  return `${respuesta.status} ${texto.slice(0, 300)}`;
}

/**
 * Envía un correo transaccional por la API HTTP de Brevo o de Resend.
 * (Se usa HTTP y no SMTP porque Railway bloquea el SMTP saliente en sus planes gratuitos.)
 */
export async function enviarCorreo(
  correo: Correo,
  config: ConfigCorreo = configDesdeEnv(),
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const proveedor = proveedorConfigurado(config);
  if (!proveedor) {
    throw new ApiError(503, 'CORREO_NO_CONFIGURADO', 'El envío de correos no está configurado en el servidor.');
  }

  let respuesta: Response;
  try {
    if (proveedor === 'brevo') {
      if (!config.remitente) {
        throw new ApiError(503, 'CORREO_NO_CONFIGURADO', 'Falta CORREO_REMITENTE para enviar correos con Brevo.');
      }
      respuesta = await fetchFn('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': config.brevoApiKey!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: config.remitenteNombre, email: config.remitente },
          to: [{ email: correo.para }],
          subject: correo.asunto,
          htmlContent: correo.html,
          textContent: correo.texto,
        }),
      });
    } else {
      // Sin dominio propio, Resend solo permite el remitente de prueba onboarding@resend.dev.
      const remitente = config.remitente ?? 'onboarding@resend.dev';
      respuesta = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${config.remitenteNombre} <${remitente}>`,
          to: [correo.para],
          subject: correo.asunto,
          html: correo.html,
          text: correo.texto,
        }),
      });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`No se pudo conectar con ${proveedor} para enviar el correo`, error);
    throw new ApiError(502, 'CORREO_NO_ENVIADO', 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.');
  }

  if (!respuesta.ok) {
    console.error(`${proveedor} rechazó el envío del correo: ${await detalleError(respuesta)}`);
    throw new ApiError(502, 'CORREO_NO_ENVIADO', 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.');
  }
}
