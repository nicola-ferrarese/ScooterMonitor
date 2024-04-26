const { Kafka } = require('kafkajs');
const {consumeKafkaMessage} = require('./consumer');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});


const connectKafka = async () => {
    await consumeKafkaMessage();
};

module.exports = { connectKafka };
