const socketIO = require('socket.io')
const auth = require('./auth');
let io = null;

module.exports = {
    initSocket: (server) => {
        io = socketIO(server, {
            cors: {
                origin: "*", // replace with your frontend server address
                methods: ["GET", "POST"],
                allowedHeaders: ["my-custom-header"],
                credentials: true
            }
        });
        console.log('Socket initialized');
        io.on('connection', (socket) => {
            console.log('New client connected');
            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
            socket.on('signUp', auth.signUp);
            socket.on('login', auth.login);
            socket.on('getData', auth.getData);
        });
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Must call .init(server) before you can call .getIO()');
        }
        return io;
    }
};
