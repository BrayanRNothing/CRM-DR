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

// Eventos básicos de depuración
socket.on('connect', () => {
    console.log('✅ Conectado a WebSockets', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Desconectado de WebSockets');
});

export default socket;
