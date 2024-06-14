const { Kafka } = require('kafkajs');
const { emitScooterUpdate } = require('../middleware/socket');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopicPositions, kafkaTopicUpdates } = require('../config');
// import functions from mongoOperations
const { createScooter, readScooter, deleteScooter, updateScooterPosition, updateTrip } = require('../db/mongoOperations');
const {initSocket} = require("../middleware/socket");
const { getIO } = require('../middleware/socket');
const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});


const consumeKafkaMessage_positions = async () => {
    const consumer = kafka.consumer({ groupId: kafkaGroupId+'-positions' });
    await consumer.connect();
    await consumer.subscribe({ topic: kafkaTopicUpdates, fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const msg = JSON.parse(message.value.toString());
            console.log(`[TRIP] Received message: %o`, msg);
            updateTrip(msg);
            const io = require('../middleware/socket').getIO();
            io.emit('tripUpdate', msg);

        },
    });
}

const consumeKafkaMessage_updates = async () => {
    const consumer = kafka.consumer({ groupId: kafkaGroupId+'-updates' });
    await consumer.connect();
    await consumer.subscribe({ topic: kafkaTopicPositions, fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const msg = JSON.parse(message.value.toString());
            console.log(`[POS] Received message: %o`, msg);

            await updateScooterPosition(msg);
            emitScooterUpdate(msg.id);
            let updateData = {
                id: msg.id,
                location: {
                    longitude: msg.lon,
                    latitude: msg.lat
                },
                inUse: true
            }
            getIO().emit('positionUpdate', updateData);
        },
    });
}

module.exports = { consumeKafkaMessage_positions, consumeKafkaMessage_updates };

