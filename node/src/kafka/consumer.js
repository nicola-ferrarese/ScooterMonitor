const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopicPositions, kafkaTopicUpdates } = require('../config');
// import functions from mongoOperations
const { createScooter, readScooter, deleteScooter, updateScooterPosition, updateTrip } = require('../db/mongoOperations');

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
            updateTrip(msg.id, msg);

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
                await updateScooterPosition(msg.id, msg);
        },
    });
}

module.exports = { consumeKafkaMessage_positions, consumeKafkaMessage_updates };

