const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');
const { updateScooter, updateTrip } = require('../db/mongoOperations');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});


const consumeKafkaMessage = async () => {
    const consumer = kafka.consumer({ groupId: kafkaGroupId });
    await consumer.connect();
    await consumer.subscribe({ topic: kafkaTopic, fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const msg = JSON.parse(message.value.toString());

            console.log(`Received message: %o`, msg);

            if (msg.event !== undefined) {
                updateTrip(msg.id, msg);
            }
            else {
                await updateScooter(msg.id, msg);
            }
        },
    });
}

module.exports = { consumeKafkaMessage };

