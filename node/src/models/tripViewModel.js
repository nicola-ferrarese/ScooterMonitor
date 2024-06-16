const mongoose = require('mongoose');

const tripViewSchema = new mongoose.Schema({
        totalDistance: Number,
        totalCost: Number,
        userId: String,
        scooterId: String,
        tripId: String,
}, { collection: 'tripView' });

const tripView = mongoose.model('TripView', tripViewSchema, 'tripView');
module.exports = tripView;

