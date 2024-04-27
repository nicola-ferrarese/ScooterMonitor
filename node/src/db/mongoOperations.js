const { getDb } = require('./mongoConnection');
const Scooter = require('../models/scooterModel');
const {sendKafkaMessage} = require("../kafka/producer");


async function createScooter(data) {
    const scooter = new Scooter(data);
    return await scooter.save();
}

async function readScooter(id) {
    return Scooter.findOne({"id":id});
}

async function updateScooter(id, updateData) {
    const io = require('../middleware/socket').getIO();
    console.log(`Sending update to scooter ${id}: ${JSON.stringify(updateData)}`);
    io.emit('scooterUpdate', updateData);
    return Scooter.findOneAndUpdate({"id": id}, updateData, {new: true});
}

async function sendDestination(id, destination) {
    console.log(`Sending destination to scooter ${id}: ${destination}`);
    return sendKafkaMessage({id, destination});
}

async function deleteScooter(id) {
    return await Scooter.findByIdAndDelete(id);
}

module.exports = { createScooter, readScooter, deleteScooter, updateScooter, sendDestination };