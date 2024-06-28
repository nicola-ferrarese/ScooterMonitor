const {getScooter} = require('../db/mongoOperations');
const Scooter = require('../models/scooterModel');
const TripView = require('../models/tripViewModel');
const {getDb} = require('../db/mongoConnection');




async function getAllScooters() {
    // get all scooters from db
    let scooters= await Scooter.find({});

    scooters = JSON.parse(JSON.stringify(scooters));

    scooters = scooters.map(scooter => {
        return {
            id: scooter.id,
            location: {
                longitude: scooter.location.longitude,
                latitude: scooter.location.latitude
            },
            inUse: scooter.status === 'available' ? false : true

    }
    });
    //console.log("[--]" + scooters);
    return scooters;
}



async function updateFrontEndScooters() {
    console.log(`[Skt.io] Updating all scooters----------------`);
    scooters = await getAllScooters();
    scooters.forEach(scooter => {
        updateFrontEndScooterPosition(scooter);
    });
}

async function updateFrontEndScooterPosition(updateData) {
    const io = require('../middleware/socket').getIO();
    console.log(`[Skt.io] Sending update ${updateData.id}: ${JSON.stringify(updateData)}`);
    let scooter = {
        id: updateData.id,
        location: {
            longitude: updateData.location.longitude,
            latitude: updateData.location.latitude
        },
        inUse: updateData.inUse
    }
    // {"id":"1_1","event":"end","distance":0,"timestamp":1718123416366,"start":{"lon":12.2248764,"lat":44.1432446},"end":{"lon":12.2271515,"lat":44.1431357}}
    // { "id", "event","end", "distance", "timestamp", "start", "end"}
    io.emit('positionUpdate', updateData);
}

const fetchScooterDataDB = async (scooter_id, callback) => {
    try {
        let scooter = await getScooter(scooter_id);
        scooter = scooter.toObject();
        if (scooter.tripId !== null && scooter.tripId !== undefined) {
            const trip = await TripView.findOne({tripId: scooter.tripId});
            //console.log(`[Skt.io] Trip data ${trip}`);
            scooter.trip = {
                ...scooter.trip,
                totalDistance: trip.totalDistance,
                totalCost: trip.totalCost,
                duration: (trip.duration / 1000 / 60).toFixed(0)
            };
        }
        //console.log(`[Skt.io] Sending scooter data ${JSON.stringify(scooter)}`);
        callback(scooter);
    } catch (error) {
        console.error(`[Skt.io] Failed to fetch scooter data: ${error}`);
    }
}


module.exports = { updateFrontEndScooters, updateFrontEndScooterPosition, fetchScooterDataDB };