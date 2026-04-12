const { Server } = require('socket.io');

let io;
// Map to track userId -> socketId for targeted emits
const userSockets = new Map();

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Listen for a client identifying themselves with a user ID
        socket.on('register', (userId) => {
            if (userId) {
                userSockets.set(userId, socket.id);
                console.log(`[Socket] Registered User: ${userId} -> Socket: ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
            // Remove from tracking map
            for (const [userId, sId] of userSockets.entries()) {
                if (sId === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io has not been initialized.');
    }
    return io;
}

/**
 * Emit an event to a specific user's connected dashboard
 */
function emitToUser(userId, eventName, payload) {
    if (!io) return;
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit(eventName, payload);
    }
}

module.exports = {
    initSocket,
    getIO,
    emitToUser
};
