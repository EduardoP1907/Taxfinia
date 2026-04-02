import nodemailer from 'nodemailer';
import { config } from '../config/env';

export interface ReportCodeEmailData {
  companyName: string;
  companyTaxId?: string | null;
  year: number;
  downloadCode: string;
  reportId: string;
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export const sendOtpEmail = async (email: string, code: string): Promise<void> => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: 'Código de verificación - PROMETHEIA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background: #f8fafc; }
          .wrapper { padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; }
          .header { background: #0f172a; padding: 32px 36px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 12px; }
          .logo-icon { width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }
          .brand { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px; }
          .tagline { color: #94a3b8; font-size: 13px; margin-top: 4px; }
          .content { background: #ffffff; padding: 36px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
          h2 { color: #0f172a; margin: 0 0 12px 0; font-size: 20px; }
          p { color: #64748b; margin: 0 0 16px 0; font-size: 15px; }
          .code-box { background: #0f172a; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
          .code { color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fefce8; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 14px; color: #713f12; }
          .footer { text-align: center; margin-top: 28px; color: #94a3b8; font-size: 12px; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div>
                <div class="brand">🔥 PROMETHEIA</div>
                <div class="tagline">Análisis y Valoración Financiera Profesional</div>
              </div>
            </div>
            <div class="content">
              <h2>Verificación de cuenta</h2>
              <p>Gracias por registrarte en PROMETHEIA. Para completar tu acceso, utiliza el siguiente código de verificación:</p>

              <div class="code-box">
                <div class="code">${code}</div>
              </div>

              <div class="warning">
                <strong>⏱ Este código expira en ${config.otp.expirationMinutes} minutos.</strong>
              </div>

              <hr class="divider">
              <p style="font-size:13px;">Si no has solicitado este código, puedes ignorar este mensaje de forma segura.</p>

              <div class="footer">
                <p>© ${new Date().getFullYear()} PROMETHEIA · Todos los derechos reservados</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email: string, code: string): Promise<void> => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: 'Recuperación de contraseña - PROMETHEIA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background: #f8fafc; }
          .wrapper { padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; }
          .header { background: #0f172a; padding: 32px 36px; border-radius: 12px 12px 0 0; }
          .brand { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px; }
          .tagline { color: #94a3b8; font-size: 13px; margin-top: 4px; }
          .content { background: #ffffff; padding: 36px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
          h2 { color: #0f172a; margin: 0 0 12px 0; font-size: 20px; }
          p { color: #64748b; margin: 0 0 16px 0; font-size: 15px; }
          .code-box { background: #0f172a; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
          .code { color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .alert { background: #fff1f2; border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 14px; color: #991b1b; }
          .warning { background: #fefce8; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 14px; color: #713f12; }
          .footer { text-align: center; margin-top: 28px; color: #94a3b8; font-size: 12px; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="brand">🔥 PROMETHEIA</div>
              <div class="tagline">Análisis y Valoración Financiera Profesional</div>
            </div>
            <div class="content">
              <h2>Recuperación de contraseña</h2>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código:</p>

              <div class="code-box">
                <div class="code">${code}</div>
              </div>

              <div class="warning">
                <strong>⏱ Este código expira en ${config.otp.expirationMinutes} minutos.</strong>
              </div>

              <div class="alert">
                <strong>⚠️ Seguridad:</strong> Si no has solicitado restablecer tu contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.
              </div>

              <hr class="divider">

              <div class="footer">
                <p>© ${new Date().getFullYear()} PROMETHEIA · Todos los derechos reservados</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendAdminReportCodeEmail = async (data: ReportCodeEmailData): Promise<void> => {
  const adminEmail = config.adminEmail || config.email.user;
  if (!adminEmail) return;

  const recipients = [adminEmail, config.secondAdminEmail].filter(Boolean).join(', ');

  const mailOptions = {
    from: config.email.from,
    to: recipients,
    subject: `[PROMETHEIA] Código de descarga — ${data.companyName} (${data.year})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background: #f8fafc; }
          .wrapper { padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; }
          .header { background: #0f172a; padding: 28px 36px; border-radius: 12px 12px 0 0; }
          .brand { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px; }
          .tagline { color: #94a3b8; font-size: 13px; margin-top: 4px; }
          .content { background: #ffffff; padding: 36px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
          h2 { color: #0f172a; margin: 0 0 8px 0; font-size: 20px; }
          .info-row { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
          .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
          .val { font-size: 15px; color: #0f172a; font-weight: 600; }
          .code-box { background: #0f172a; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
          .code { color: #f59e0b; font-size: 32px; font-weight: 700; letter-spacing: 6px; font-family: 'Courier New', monospace; }
          .alert { background: #fefce8; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 14px; color: #713f12; margin: 16px 0; }
          .footer { text-align: center; margin-top: 28px; color: #94a3b8; font-size: 12px; }
          hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="brand">🔥 PROMETHEIA</div>
              <div class="tagline">Panel de Administración</div>
            </div>
            <div class="content">
              <h2>Nuevo Código de Descarga Generado</h2>
              <p style="color:#64748b; margin:0 0 20px 0; font-size:15px;">Se ha generado un código de descarga para el siguiente informe. Entrégalo al cliente <strong>solo después de confirmar el pago</strong>.</p>

              <div class="info-row">
                <div class="lbl">Empresa</div>
                <div class="val">${data.companyName}</div>
              </div>
              ${data.companyTaxId ? `
              <div class="info-row">
                <div class="lbl">NIF / RUT</div>
                <div class="val">${data.companyTaxId}</div>
              </div>` : ''}
              <div class="info-row">
                <div class="lbl">Año del Informe</div>
                <div class="val">${data.year}</div>
              </div>
              <div class="info-row">
                <div class="lbl">ID del Informe</div>
                <div class="val" style="font-size:13px; font-family: monospace; color:#64748b;">${data.reportId}</div>
              </div>

              <div class="lbl" style="text-align:center; margin-top:20px;">Código de Acceso del Cliente</div>
              <div class="code-box">
                <div class="code">${data.downloadCode}</div>
              </div>

              <div class="alert">
                <strong>⚠️ Importante:</strong> Sin este código, el cliente no puede descargar el informe. Verifica el pago antes de compartirlo.
              </div>

              <hr>
              <div class="footer">
                <p>© ${new Date().getFullYear()} PROMETHEIA · Administración</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
