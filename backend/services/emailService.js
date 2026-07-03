const { resend } = require('../lib/resend');
const ics = require('ics');

/**
 * Envia un correo de bienvenida a un usuario nuevo con sus credenciales.
 * @param {string} emailUsuario El correo del usuario.
 * @param {string} nombre El nombre completo del usuario.
 * @param {string} usuario El nombre de usuario en el CRM.
 * @param {string} plan El plan adquirido.
 */
const enviarCorreoBienvenida = async (emailUsuario, nombre = 'Usuario', usuario = '', plan = 'Básico') => {
  try {
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'notificaciones@solomycrm.com';
    const loginUrl = process.env.CRM_URL || 'https://app.solomycrm.com/login';
    
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin: 0 auto; border: 1px solid #e4e4e7; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #ffffff; padding: 40px 40px 20px 40px; border-bottom: 1px solid #e4e4e7;">
                    <div style="display: inline-block; text-align: center;">
                      <img src="https://solomycrm.com/ISOTIPO%20SOLOMYCRM.png" alt="" height="52" style="vertical-align: middle; margin-right: 12px; border: 0;" />
                      <span style="color: #09090b; font-size: 32px; font-weight: 800; letter-spacing: -0.04em; vertical-align: middle;">SoloMyCRM</span>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px; color: #3f3f46;">
                    <h2 style="font-size: 20px; font-weight: 600; color: #09090b; margin-top: 0; margin-bottom: 24px; letter-spacing: -0.02em;">¡Bienvenido/a, ${nombre.split(' ')[0]}!</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; color: #52525b;">Tu pago fue procesado exitosamente y tu cuenta ya se encuentra activa con el plan <strong>${plan}</strong>.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; color: #52525b;">Aquí tienes tus datos de acceso oficiales. Te recomendamos guardar este correo para futuras referencias:</p>
                    
                    <!-- Credentials Box -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; font-size: 15px; color: #27272a;"><span style="color: #71717a; display: inline-block; width: 90px;">Usuario:</span> <strong style="color: #09090b;">${usuario}</strong></p>
                          <p style="margin: 0 0 16px 0; font-size: 15px; color: #27272a;"><span style="color: #71717a; display: inline-block; width: 90px;">Correo:</span> <strong style="color: #09090b;">${emailUsuario}</strong></p>
                          <p style="margin: 0; font-size: 15px; color: #27272a;"><span style="color: #71717a; display: inline-block; width: 90px;">Contraseña:</span> <span style="color: #09090b;"><em>La contraseña que elegiste al registrarte</em></span></p>
                        </td>
                      </tr>
                    </table>

                    <!-- Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #09090b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; border: 1px solid #09090b;">Acceder a mi cuenta</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Help Section -->
                <tr>
                  <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #09090b;">¿Necesitas ayuda?</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #71717a;">
                      Si olvidaste tu contraseña o tienes problemas para entrar, puedes restablecerla directamente desde la pantalla de inicio de sesión o responder a este correo.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #ffffff; padding: 24px; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa;">© ${new Date().getFullYear()} SoloMyCRM. Todos los derechos reservados.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: `SoloMyCRM <${senderEmail}>`,
      to: [emailUsuario],
      subject: '¡Tu cuenta ha sido creada con éxito! 🚀',
      html: htmlTemplate,
    });

    console.log('Correo de bienvenida enviado:', data);
    return data;
  } catch (error) {
    console.error('Error al enviar el correo de bienvenida:', error);
    throw error;
  }
};

/**
 * Envia una invitación de calendario (archivo .ics) por correo electrónico.
 */
const enviarInvitacionCalendario = async ({
  fechaInicioISO, // formato ISO (ej. '2023-10-15T10:00:00Z')
  duracionMinutos = 45,
  titulo,
  descripcion,
  jitsiLink,
  emailsAsistentes,
}) => {
  try {
    // 1. Preparar la fecha para la librería ics (espera [YYYY, M, D, H, m])
    const startDate = new Date(fechaInicioISO);
    const dateArray = [
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes()
    ];

    // 2. Crear el evento ICS
    const event = {
      start: dateArray,
      duration: { minutes: duracionMinutos },
      title: titulo,
      description: `${descripcion}\n\nEnlace de la videollamada: ${jitsiLink}`,
      location: jitsiLink,
      url: jitsiLink,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'SoloMyCRM', email: 'notificaciones@solomycrm.com' },
      attendees: emailsAsistentes.map(email => ({
        name: email.split('@')[0],
        email: email,
        rsvp: true,
        partstat: 'NEEDS-ACTION',
        role: 'REQ-PARTICIPANT'
      }))
    };

    const { error, value } = ics.createEvent(event);

    if (error) {
      console.error('Error creando el archivo ICS:', error);
      throw error;
    }

    const icsContent = value;
    const base64Ics = Buffer.from(icsContent).toString('base64');

    // 3. Enviar el correo con Resend incluyendo el adjunto
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'notificaciones@solomycrm.com';
    const data = await resend.emails.send({
      from: `SoloMyCRM Calendario <${senderEmail}>`,
      to: emailsAsistentes,
      subject: `Invitación a Videollamada: ${titulo.replace('[CITA] - ', '')}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin: 0 auto;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #0f172a; padding: 35px 20px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">SoloMyCRM</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 35px; color: #334155;">
                      <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 20px;">Invitación a Videollamada</h2>
                      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">Hola,</p>
                      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">Has sido invitado a una nueva reunión. A continuación encontrarás todos los detalles para conectarte:</p>
                      
                      <!-- Info Box -->
                      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 25px; margin-bottom: 35px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;"><strong>📝 Asunto:</strong> ${titulo.replace('[CITA] - ', '')}</p>
                        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;"><strong>📅 Fecha y Hora:</strong> ${new Date(fechaInicioISO).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })} Hrs</p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6;"><strong>📋 Detalles adicionales:</strong><br/>${descripcion.replace(/\n/g, '<br/>')}</p>
                      </div>

                      <!-- Action Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="${jitsiLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Unirse a la Videollamada</a>
                            <p style="font-size: 12px; color: #94a3b8; margin-top: 15px;">O copia y pega este enlace en tu navegador:<br/><a href="${jitsiLink}" style="color: #2563eb; text-decoration: underline;">${jitsiLink}</a></p>
                          </td>
                        </tr>
                      </table>

                      <!-- Attachment Notice -->
                      <p style="font-size: 13px; color: #64748b; margin-top: 35px; margin-bottom: 0; border-top: 1px solid #e2e8f0; padding-top: 25px; line-height: 1.5;">
                        📎 <strong>Importante:</strong> Hemos adjuntado un archivo <code>invite.ics</code> a este correo. Ábrelo o descárgalo para guardar esta reunión directamente en tu calendario de preferencia (Google Calendar, Outlook, Apple Calendar).
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 12px; color: #94a3b8;">Este es un mensaje automático generado por <strong>SoloMyCRM</strong>.<br/>Por favor, no respondas a este correo.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'invite.ics',
          content: base64Ics,
          content_type: 'text/calendar; method=REQUEST'
        }
      ]
    });

    console.log('Invitación de calendario enviada:', data);
    return data;
  } catch (err) {
    console.error('Error al enviar invitación de calendario:', err);
    throw err;
  }
};

module.exports = {
  enviarCorreoBienvenida,
  enviarInvitacionCalendario
};
