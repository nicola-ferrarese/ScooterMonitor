const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    scooterId: String,
    tripId: String,
    timestamp: Date,
    userId: String,
    start: {
        latitude: Number,
        longitude: Number
    },
    end: {
        latitude: Number,
        longitude: Number
    },
    distance: Number,
    cost: Number
}, { collection: 'trip_segments' });

const TripSegment = mongoose.model('Trip', tripSchema, 'trip_segments');
module.exports = TripSegment;

