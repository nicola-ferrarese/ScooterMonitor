const { Kafka } = require('kafkajs');
const { consumeKafkaMessage_updates, consumeKafkaMessage_positions} = require('./consumer');
const { initializeScooters } = require('./producer');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});


const connectKafka = async () => {
    console.log(`Connecting to Kafka: ${kafkaBrokers}`);
    await consumeKafkaMessage_updates();
    await consumeKafkaMessage_positions();
    console.log(`Connected to Kafka, initializing, scooters`);
    await initializeScooters();
    console.log(`Scooters initialized`);


};

module.exports = { connectKafka };
