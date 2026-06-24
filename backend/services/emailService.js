const { resend } = require('../lib/resend');
const ics = require('ics');

/**
 * Envia un correo de bienvenida a un usuario nuevo.
 * @param {string} emailUsuario El correo del usuario.
 */
const enviarCorreoBienvenida = async (emailUsuario) => {
  try {
    const data = await resend.emails.send({
      from: 'SoloMyCRM <notificaciones@solomycrm.com>',
      to: [emailUsuario],
      subject: 'Bienvenido a SoloMyCRM',
      html: '<p>¡Gracias por unirte a SoloMyCRM!</p>', // Aquí pondrás tu plantilla de React Email o HTML después
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
    const data = await resend.emails.send({
      from: 'SoloMyCRM Calendario <notificaciones@solomycrm.com>',
      to: emailsAsistentes,
      subject: `Invitación: ${titulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #2563eb;">Invitación a Reunión</h2>
          <p>Has sido invitado a la siguiente reunión: <strong>${titulo}</strong></p>
          <p><strong>Detalles:</strong><br/>${descripcion.replace(/\n/g, '<br/>')}</p>
          <p><strong>Enlace de la videollamada:</strong> <a href="${jitsiLink}">${jitsiLink}</a></p>
          <p><em>Encuentras adjunto un archivo de calendario (.ics). Ábrelo para agregarlo a tu agenda.</em></p>
        </div>
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
