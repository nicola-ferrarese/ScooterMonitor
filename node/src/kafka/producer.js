const { Kafka } = require('kafkajs');
const { kafkaBrokers, kafkaClientId, kafkaGroupId, kafkaTopicCommands , kafkaTopicUpdates} = require('../config');
const Scooter = require('../models/scooterModel');

const kafka = new Kafka({
    clientId: kafkaClientId,
    brokers: kafkaBrokers,
});

const producer = kafka.producer();


const sendKafkaMessage = async (id, body) => {
    await producer.connect();
    console.log(`[KAF] %o %o`, id, body);
    await producer.send({
        topic: kafkaTopicCommands,
        messages: [
            { value: JSON.stringify({ id, ...body }) },
        ],
    });
    console.log(JSON.stringify({ id, ...body }));
    return true;
}

const initializeScooters = async () => {
    let scooters = await Scooter.find({});
    for (const scooter_id of scooters.map(scooter => scooter.id)) {
        // get location of scooter from db
        let scooter = await Scooter.findOne({ "id": scooter_id });
        await producer.connect();
        const body =  {
            "id": scooter_id,
                "event": "end",
                "distance": 0,
                "end": {
                    "lon": scooter.location.longitude,
                    "lat": scooter.location.latitude
                }
        }
        await producer.send({ topic: kafkaTopicUpdates, messages: [{ value: JSON.stringify(body) }] });
    }
}
module.exports = { sendKafkaMessage, initializeScooters };