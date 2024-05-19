require('dotenv').config();

module.exports = {
    // MongoDB
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'Scooter',
    mongoUser: process.env.MONGO_USER || 'rootuser',
    mongoPass: process.env.MONGO_PASS || 'rootpass',
    mongoauthSource: process.env.MONGO_AUTH_SOURCE || 'admin',

    kafkaBrokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    kafkaClientId: process.env.KAFKA_CLIENT_ID || 'my-app',
    kafkaGroupId: process.env.KAFKA_GROUP_ID || 'test-group',
    kafkaTopicCommands: process.env.KAFKA_TOPIC_COMMANDS || 'scooter_commands',
    kafkaTopicUpdates: process.env.KAFKA_TOPIC_UPDATES || 'scooter_updates',
    kafkaTopicPositions: process.env.KAFKA_TOPIC_POSITION || 'scooter_positions'
};
