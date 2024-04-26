const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');
const { updateScooter } = require('../db/mongoOperations');

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

            if (msg.status !== undefined) {
                console.log(`Received message: %o`, msg);
            }
            //await updateScooter(msg.id, {});
            let x = updateScooter(msg.id, {status: msg.status});
        },
    });
}

module.exports = { consumeKafkaMessage };

