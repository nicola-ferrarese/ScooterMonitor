const { getDb } = require('./mongoConnection');
const Scooter = require('../models/scooterModel');
const TripSegment = require('../models/tripModel');
const uuid = require('uuid');
const {sendKafkaMessage} = require("../kafka/producer");
const User = require("../models/userModel");


async function createScooter(data) {
    const scooter = new Scooter(data);
    return await scooter.save();
}

const getScooter = async (scooterId) => {
    const scooter = await Scooter.findOne({ id: scooterId });
    return scooter;
};


async function updateScooterPosition(updateData) {

    // TODO: double check to ensure is correctly updatingg the db
    try {
        console.log(`Updating scooter: ${updateData.id}`);
        const data = {
            id: updateData.id,
            location: {
                longitude: updateData.lon,
                latitude: updateData.lat
            },
            inUse: true
        }
        if (updateData.lat !== undefined) {
            await Scooter.findOneAndUpdate({id: data.id}, data, {upsert: true, new: true, strict: false});
        }

    }
    catch (error) {
        console.error('Failed to update scooter:', error);
    }

}

async function updateTrip(updateData) {

    try {
        const event = updateData.event;
        const id = updateData.id;
        const user = await User.findOne({currentRide: updateData.tripId}).lean();
        if (event === 'start'){
            let trip = new TripSegment({
                scooterId: updateData.id,
                tripId: updateData.tripId,
                start: {
                    longitude: updateData.start.lon,
                    latitude: updateData.start.lat
                },
                end: {
                    longitude: updateData.start.lon,
                    latitude: updateData.start.lat
                },
                timestamp: updateData.timestamp,
                userId: user._id,
            });
            // perform trip.save and save the _id

            console.log("Saving trip" + trip)
            const _id = (await trip.save())._id;
            await Scooter.findOneAndUpdate({id: id}, {tripId: updateData.tripId, status: 'in-use'}, {upsert: true, new: true, strict: false});

        }
        else if (event === 'end') {
            await Scooter.findOneAndUpdate({id: id}, {tripId: null, status: 'available', inUse: false}, {upsert: true, new: true, strict: false});
            await Scooter.findOneAndUpdate({id: id}, {location: {longitude: updateData.end.lon, latitude: updateData.end.lat}}, {upsert: true, new: true, strict: false});

            const latestTrip = await getDb().collection('tripView').findOne({ scooterId: id }, { sort: { _id: -1 } });
            const userId = latestTrip ? latestTrip.userId : null;
            if (userId) {
                await User.findOneAndUpdate({_id: userId}, {currentRide: null}, {upsert: true, new: true, strict: false});
            }
        }
        else if (event === 'update') {
            const scooter = await Scooter.findOne({id: id});
            let tripId = scooter.tripId;
            console.log(`TripId: ${tripId}`);
            if (tripId === null) {
                await Scooter.findOneAndUpdate({id: id}, {tripId: updateData.tripId, status: 'in-use'}, {upsert: true, new: true, strict: false});
            }
            console.log(`TripId: ${tripId}`);
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

module.exports = { createScooter, getScooter, deleteScooter, updateScooterPosition, updateTrip };