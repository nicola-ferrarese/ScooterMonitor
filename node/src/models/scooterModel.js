const mongoose = require('mongoose');

const scooterSchema = new mongoose.Schema({
    id: String,
    model: String,
    status: {
        type: String,
        enum: ['available', 'in-use', 'unavailable'],
        default: 'available'
    },
    tripId: String,
    lastCheck: Date,
    batteryLevel: Number,
    location: {
        latitude: Number,
        longitude: Number
    },
}, { collection: 'scooters' });

const Scooter = mongoose.model('Scooter', scooterSchema, 'scooters');
module.exports = Scooter;

