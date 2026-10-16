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

export const sendNewUserNotificationEmail = async (userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  planType?: string;
  hasInviteToken?: boolean;
}): Promise<void> => {
  const adminEmail = 'fmonroy@fm02.cl';
  const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || '(sin nombre)';
  const plan = userData.hasInviteToken ? 'TRIAL (con invitación)' : (userData.planType || 'STANDARD');

  const mailOptions = {
    from: config.email.from,
    to: adminEmail,
    subject: `[PROMETHEIA] Nuevo usuario registrado — ${userData.email}`,
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
              <h2>Nuevo Usuario Registrado</h2>
              <p style="color:#64748b; margin:0 0 20px 0; font-size:15px;">Se ha creado una nueva cuenta en la plataforma. Queda <strong>deshabilitada</strong> hasta que la habilites desde el panel de administración.</p>

              <div class="info-row">
                <div class="lbl">Nombre</div>
                <div class="val">${fullName}</div>
              </div>
              <div class="info-row">
                <div class="lbl">Email</div>
                <div class="val">${userData.email}</div>
              </div>
              <div class="info-row">
                <div class="lbl">Plan</div>
                <div class="val">${plan}</div>
              </div>
              <div class="info-row">
                <div class="lbl">Fecha de Registro</div>
                <div class="val">${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</div>
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

/** Aviso al usuario de que su suscripción vence pronto (se envía ~30 días antes). */
export const sendSubscriptionExpiryWarningEmail = async (data: {
  email: string;
  firstName?: string | null;
  endsAt: string; // fecha ya formateada (dd-mm-aaaa)
}): Promise<void> => {
  const name = data.firstName || 'Hola';
  await transporter.sendMail({
    from: config.email.from,
    to: data.email,
    subject: `[PROMETHEIA] Tu suscripción vence el ${data.endsAt}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; background: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 580px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 28px 36px; border-radius: 12px 12px 0 0;">
            <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px;">🔥 PROMETHEIA</div>
          </div>
          <div style="background: #ffffff; padding: 36px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">${name}, tu suscripción vence pronto</h2>
            <p>Tu suscripción a PROMETHEIA vence el <strong>${data.endsAt}</strong>.</p>
            <p>Desde esa fecha tu cuenta quedará en <strong>modo solo lectura</strong>: podrás ver y descargar los informes ya generados, pero no cargar datos, generar informes nuevos ni usar el asistente IA.</p>
            <p>Para renovarla, contacta al administrador. Una vez renovada podrás agregar el ejercicio recién cerrado.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 28px; text-align: center;">© ${new Date().getFullYear()} PROMETHEIA</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

/** Aviso al usuario de que el administrador habilitó su cuenta. */
export const sendAccountActivatedEmail = async (data: {
  email: string;
  firstName?: string | null;
}): Promise<void> => {
  const name = data.firstName || 'Hola';
  const loginUrl = `${config.frontendUrl}/login`;
  await transporter.sendMail({
    from: config.email.from,
    to: data.email,
    subject: '[PROMETHEIA] Tu cuenta ha sido habilitada',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; background: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 580px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 28px 36px; border-radius: 12px 12px 0 0;">
            <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px;">🔥 PROMETHEIA</div>
          </div>
          <div style="background: #ffffff; padding: 36px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">${name}, tu cuenta ya está habilitada</h2>
            <p>El administrador habilitó tu cuenta en PROMETHEIA. Ya puedes iniciar sesión.</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" style="background: #f59e0b; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Iniciar sesión</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 28px; text-align: center;">© ${new Date().getFullYear()} PROMETHEIA</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};
