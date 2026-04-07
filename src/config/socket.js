import { io } from 'socket.io-client';
import API_URL from './api';

// Inicializar conexión con el servidor
export const socket = io(API_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
});

// Emitir join_team al conectar/reconectar para recibir solo eventos del propio equipo
const joinTeamRoom = () => {
    try {
        const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.equipo_id) {
                socket.emit('join_team', user.equipo_id);
                console.log(`👥 Unido a sala WebSocket: team_${user.equipo_id}`);
            }
        }
    } catch (e) {
        // silencioso — equipo_id puede no existir en tokens viejos
    }
};

// Eventos básicos de depuración
socket.on('connect', () => {
    console.log('✅ Conectado a WebSockets', socket.id);
    joinTeamRoom();
});

socket.on('reconnect', () => {
    joinTeamRoom();
});

socket.on('disconnect', () => {
    console.log('❌ Desconectado de WebSockets');
});

export default socket;
