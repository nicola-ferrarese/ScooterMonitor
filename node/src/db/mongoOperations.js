const { getDb } = require('./mongoConnection');

const updateScooter = async (id, status, node_id) => {
    const db = getDb();
    const collection = db.collection('scooters');
    console.log(`Updating scooter ${id} with status ${status} and node_id ${node_id}`);
    return collection.updateOne({ id }, { $set: { status, node_id } }, { upsert: true });
};

module.exports = { updateScooter };
