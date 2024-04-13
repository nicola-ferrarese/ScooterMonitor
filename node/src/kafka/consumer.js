const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');
const { updateScooter } = require('../db/mongoOperations');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: kafkaGroupId });

const connectKafka = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: kafkaTopic, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const msg = JSON.parse(message.value.toString());

            if (msg.status !== undefined) {
                console.log(`Received message: %o`, msg);
            }
            await updateScooter(msg.id, msg.status, msg.node_id);
        },
    });
};

module.exports = { connectKafka };
