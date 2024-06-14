const socketIO = require('socket.io')
const auth = require('./auth');
const Scooter = require('../models/scooterModel'); // Ensure you have the correct path
const {updateFrontEndScooters, fetchScooterDataDB, updateFrontEndScooterPosition} = require('./scooterService');
let io = null;
const {evaluateStart, evaluateStop} = require('./TripManager');

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
            socket.on('requestAllScooters', async () => {
                await updateFrontEndScooters();
            });
            socket.on('signUp', auth.signUp);
            socket.on('login', auth.login);
            socket.on('getData', auth.getData);
            socket.on('fetchScooterData', async (scooterId, callback) => {
                await fetchScooterDataDB(scooterId, callback);
            });
            socket.on('startRide', async (data, callback) => {
                const { scooter_id, token } = data;
                const result = await evaluateStart(scooter_id , token);
                callback(result);
            });
            socket.on('stopRide', async (data, callback) => {
                const { scooter_id, token } = data;
                const result = await evaluateStop(scooter_id , token);
                callback(result);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Must call .init(server) before you can call .getIO()');
        }
        return io;
    },
    emitScooterUpdate: (scooter_id) => {
        fetchScooterDataDB(scooter_id, (scooterData) => {
            io.emit('updateScooterData', scooterData);
        });
    },
};
