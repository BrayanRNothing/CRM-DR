
// src/services/googleCalendar.js

/**
 * Crea una reunión en Google Calendar.
 * @param {string} accessToken - Token de acceso de Google.
 * @param {object} eventDetails - Detalles de la reunión (summary, description, start, end, attendees).
 * @returns {Promise<object>} - Respuesta de la API de Google Calendar.
 */
export const createMeeting = async (accessToken, eventDetails) => {
    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventDetails),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error creating event: ${errorData.error.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error in createMeeting:", error);
        throw error;
    }
};

/**
 * Obtiene la disponibilidad (free/busy) de una lista de correos.
 * @param {string} accessToken - Token de acceso.
 * @param {string} timeMin - Fecha de inicio (ISO string).
 * @param {string} timeMax - Fecha de fin (ISO string).
 * @param {Array<string>} emails - Lista de correos a verificar.
 * @returns {Promise<object>} - Objeto con la disponibilidad.
 */
export const getFreeBusy = async (accessToken, timeMin, timeMax, emails) => {
    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timeMin,
                timeMax,
                items: emails.map(email => ({ id: email })),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error fetching free/busy: ${errorData.error.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error in getFreeBusy:", error);
        throw error;
    }
};

/**
 * Lista los eventos del calendario principal.
 * @param {string} accessToken
 * @param {string} timeMin
 * @param {string} timeMax
 * @returns {Promise<Array>}
 */
export const listEvents = async (accessToken, timeMin, timeMax) => {
    try {
        const params = new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
        });

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error listing events: ${errorData.error.message}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error in listEvents:", error);
        throw error;
    }
}
