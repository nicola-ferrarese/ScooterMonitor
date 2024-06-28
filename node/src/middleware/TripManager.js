const { getDb } = require('../db/mongoConnection'); // Ensure correct path to mongoConnection
const { sendKafkaMessage } = require('../kafka/producer'); // Ensure correct path to sendCommand
const  Scooter  = require('../models/scooterModel');
const  User  = require('../models/userModel');
const  auth  = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const  TripView  = require('../models/tripViewModel');
const evaluateStart = async (scooter_id, token) => {
    try {
        const db = getDb();
        const scooter = await db.collection('scooters').findOne({ id: scooter_id });

        const user = await auth.getUser(token);
        if (!user) {
            return { error: 'Invalid token or wrong user' };
        }
        if (user.currentRide !== null) {
            // fetch the scooter that the user is currently riding, by looking in trips collection
            const currentScooter = await db.collection('tripView').findOne({ tripId: user.currentRide });

            return { error: `User already has a ride, ${currentScooter.scooterId}`, status: 'Already riding'};
        }
        if (!scooter) {
            return { error: 'Scooter not found' };
        }

        if (scooter.status !== 'available') {
            return { error: 'Scooter is not available' };
        }

        //if (user.credit < 10) { // Example credit check
        //    return { error: 'Insufficient credit' };
        //}

        // Update scooter status to in-use
        const tripId = uuidv4();
        await Scooter.updateOne({ id: scooter_id }, { $set: { status: 'in-use', inUse: true } });
        await User.updateOne({ _id: user._id }, { $set: { currentRide: tripId } });

        // Send command to start the ride
        await sendKafkaMessage(scooter_id, { command: 'start', tripId: tripId });

        return { success: true, message: 'Ride started successfully' };
    } catch (error) {
        console.error(`[Trip Manager] Failed to evaluate start: ${error}`);
        const user = await auth.getUser(token);

        await Scooter.updateOne({ id: scooter_id }, { $set: { status: 'available', inUse: false } });
        await User.updateOne({ _id: user._id }, { $set: { currentRide: null } });
        return { error: 'Failed to start ride' };
    }
};

const evaluateStop = async (scooter_id, token) => {
    try {
        const user = await auth.getUser(token);

        if (!user) {
            return { error: 'Invalid token or wrong user' };
        }


        await Scooter.updateOne({ id: scooter_id }, { $set: { status: 'available', inUse: false } })
        await User.updateOne({ _id: user._id }, { $set: { currentRide: null } });
        await sendKafkaMessage(scooter_id, { command: 'stop' });
        return { success: true, message: 'Ride stopped successfully' };
    }
    catch (error) {
        console.error(`[Trip Manager] Failed to evaluate stop: ${error}`);
        return { error: 'Failed to stop ride' };
    }
};
const getTripView = async (scooter_id) => {
    try {
        let trips;
        if (!scooter_id) {
            trips = await TripView.find().sort({ date: -1 }).lean();
        }
        else {
            trips = await TripView.find({ scooterId: scooter_id }).sort({ date: -1 }).lean();
        }
        return ({ success: true, trips });
    } catch (error) {
            return({ success: false, message: error.message });
    }
}
module.exports = { evaluateStart ,evaluateStop, getTripView};
