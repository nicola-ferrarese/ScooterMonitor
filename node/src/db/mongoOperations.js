const { getDb } = require('./mongoConnection');
const Scooter = require('../models/scooterModel');
const TripSegment = require('../models/tripModel');
const uuid = require('uuid');
const {sendKafkaMessage} = require("../kafka/producer");



async function createScooter(data) {
    const scooter = new Scooter(data);
    return await scooter.save();
}

async function readScooter(id) {
    return Scooter.findOne({"id":id});
}

async function updateScooterPosition(id, updateData) {
    const io = require('../middleware/socket').getIO();
    console.log(`[Skt.io] Sending update ${id}: ${JSON.stringify(updateData)}`);
    io.emit('positionUpdate', updateData);

    try {
        const data = {
            location: {
                longitude: updateData.lon,
                latitude: updateData.lat
            }
        }
        if (updateData.lat !== undefined) {
            await Scooter.findOneAndUpdate({id: id}, data, {upsert: true, new: true, strict: false});
        }
    } catch (error) {
        console.error('Failed to update scooter:', error);
    }

}

async function updateTrip(id, updateData) {
    const io = require('../middleware/socket').getIO();
    console.log(`[Skt.io] Sending update ${id}: ${JSON.stringify(updateData)}`);
    io.emit('tripUpdate', updateData);
    try {
        const event = updateData.event;
        if (event === 'start'){
            const tripId = uuid.v4();
            const trip = new TripSegment({
                scooterId: id,
                tripId: tripId,
                start: {
                    longitude: updateData.start.lon,
                    latitude: updateData.start.lat
                },
                timestamp: updateData.timestamp
            });
            // perform trip.save and save the _id
            const _id = (await trip.save())._id;
            await Scooter.findOneAndUpdate({id: id}, {currentTripId: tripId, status: 'in-use'}, {upsert: true, new: true, strict: false});
        }
        else if (event === 'end') {
            await Scooter.findOneAndUpdate({id: id}, {currentTripId: null, status: 'available'}, {upsert: true, new: true, strict: false});
        }
        else if (event === 'update') {
            let tripId = await Scooter.findOne({id: id}).select('currentTripId -_id');
            tripId = tripId.currentTripId;
            console.log(tripId)
            await new TripSegment( {
                scooterId: id,
                tripId: tripId,
                timestamp: updateData.timestamp,
                start: {
                    longitude: updateData.start.lon,
                    latitude: updateData.start.lat
                },
                end: {
                    longitude: updateData.end.lon,
                    latitude: updateData.end.lat
                },
                distance: updateData.distance,
                cost: updateData.distance * 0.5
            }).save();
        }
    } catch (error) {
        console.error('Failed to update trip:', error);
    }
}

async function sendDestination(id, destination) {
    console.log(`Sending destination to scooter ${id}: ${destination}`);
    return sendKafkaMessage({id, destination});
}

async function deleteScooter(id) {
    return await Scooter.findByIdAndDelete(id);
}

module.exports = { createScooter, readScooter, deleteScooter, updateScooterPosition, updateTrip };