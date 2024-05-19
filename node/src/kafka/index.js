const { Kafka } = require('kafkajs');
const { consumeKafkaMessage_updates, consumeKafkaMessage_positions} = require('./consumer');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopic } = require('../config');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});


const connectKafka = async () => {
    await consumeKafkaMessage_updates();
    await consumeKafkaMessage_positions();
};

module.exports = { connectKafka };
