// src/models/scooterModel.js
const mongoose = require('mongoose');

const scooterSchema = new mongoose.Schema({
    id: String,
    model: String,
    status: {
        type: String,
        enum: ['available', 'in service', 'unavailable'],
        default: 'available'
    },
    lastCheck: Date,
    batteryLevel: Number,
    location: {
        latitude: Number,
        longitude: Number
    }
});

module.exports = mongoose.model('Scooter', scooterSchema);
