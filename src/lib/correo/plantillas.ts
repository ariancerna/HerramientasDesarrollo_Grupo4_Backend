import type { Correo } from './correo';

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Correo con el código de 6 dígitos para recuperar la contraseña (AUTH-07). */
export function correoCodigoRecuperacion(opciones: {
  para: string;
  nombre?: string | null;
  codigo: string;
  minutosVigencia: number;
  club: string;
}): Correo {
  const club = escaparHtml(opciones.club);
  const saludo = opciones.nombre ? `Hola, ${escaparHtml(opciones.nombre.split(' ')[0] ?? opciones.nombre)}:` : 'Hola:';
  const asunto = `${opciones.codigo} es tu código para recuperar tu contraseña`;

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#0b1b3a;padding:24px 28px;color:#ffffff;font-size:18px;font-weight:bold">${club}</td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;font-size:15px">${saludo}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:22px">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa este código en la pantalla de recuperación:</p>
          <p style="margin:0 0 20px;text-align:center;font-size:34px;font-weight:bold;letter-spacing:10px;color:#1e3a8a;background:#eff6ff;border-radius:12px;padding:16px 0">${opciones.codigo}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#475569">El código vence en ${opciones.minutosVigencia} minutos y solo puede usarse una vez.</p>
          <p style="margin:0;font-size:13px;color:#475569">Si no pediste cambiar tu contraseña, ignora este correo: tu cuenta sigue segura.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const texto = [
    opciones.nombre ? `Hola, ${opciones.nombre.split(' ')[0]}:` : 'Hola:',
    '',
    `Tu código para recuperar la contraseña de ${opciones.club} es: ${opciones.codigo}`,
    `Vence en ${opciones.minutosVigencia} minutos y solo puede usarse una vez.`,
    '',
    'Si no pediste cambiar tu contraseña, ignora este correo.',
  ].join('\n');

  return { para: opciones.para, asunto, html, texto };
}
