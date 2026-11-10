import { env } from '../../config/env';
import { ApiError } from '../errors/api-error';

export interface CargoCulqiInput {
  /** Importe en soles; se envía a Culqi en céntimos. */
  monto: number;
  email: string;
  /** Token de tarjeta generado por Culqi Checkout en el navegador (tkn_...). */
  token: string;
  descripcion: string;
  metadata?: Record<string, string>;
}

export interface CargoCulqi {
  id: string;
}

export interface PasarelaPago {
  crearCargo(input: CargoCulqiInput): Promise<CargoCulqi>;
}

interface RespuestaCulqi {
  object?: string;
  id?: string;
  user_message?: string;
  merchant_message?: string;
}

export function crearPasarelaCulqi(
  secretKey = env.culqiSecretKey,
  apiUrl = env.culqiApiUrl,
  fetchFn: typeof fetch = fetch,
): PasarelaPago {
  async function crearCargo(input: CargoCulqiInput): Promise<CargoCulqi> {
    if (!secretKey) {
      throw new ApiError(503, 'PASARELA_NO_CONFIGURADA', 'El pago con tarjeta no está disponible en este momento.');
    }

    let respuesta: Response;
    try {
      respuesta = await fetchFn(`${apiUrl}/charges`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(input.monto * 100),
          currency_code: 'PEN',
          email: input.email,
          source_id: input.token,
          description: input.descripcion.slice(0, 80),
          metadata: input.metadata,
        }),
      });
    } catch {
      throw new ApiError(502, 'PASARELA_NO_DISPONIBLE', 'No se pudo conectar con la pasarela de pago. Intenta nuevamente.');
    }

    const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaCulqi;

    if (!respuesta.ok || cuerpo.object === 'error' || !cuerpo.id) {
      // user_message es el texto que Culqi recomienda mostrar al cliente (tarjeta rechazada, fondos insuficientes, etc.).
      throw new ApiError(
        402,
        'PAGO_RECHAZADO',
        cuerpo.user_message ?? 'La pasarela rechazó el pago. Verifica los datos de tu tarjeta.',
        cuerpo.merchant_message ? { motivo: cuerpo.merchant_message } : undefined,
      );
    }

    return { id: cuerpo.id };
  }

  return { crearCargo };
}
