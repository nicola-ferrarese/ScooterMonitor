const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopicCommands } = require('../config');


const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});

const producer = kafka.producer();


const sendKafkaMessage = async (id, body) => {
    await producer.connect();
    console.log(`Sending message: %o %o`, id, body);
    await producer.send({
        topic: kafkaTopicCommands,
        messages: [
            { value: JSON.stringify({ id, ...body }) },
        ],
    });
    console.log(JSON.stringify({ id, ...body }));
    return true;
}

module.exports = { sendKafkaMessage };