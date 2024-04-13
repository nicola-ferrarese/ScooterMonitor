const { mongoUrl,
        dbName,
        mongoPass,
        mongoauthSource,
    mongoUser
} = require('../config');
let dbInstance = null;

const mongoose = require('mongoose');
const uri = `${mongoUrl}/${dbName}`;
const options = {
    authSource: mongoauthSource,
    user: mongoUser,
    pass: mongoPass
    };
const connectMongo = async () => {
    mongoose.connect(uri, options)
        .then(() => console.log('MongoDB connection successful'))
        .catch(err => console.error('MongoDB connection error:', err));
    console.log("Connected successfully to MongoDB server");
    dbInstance = mongoose.connection;
};

const getDb = () => {
    if (!dbInstance) {
        throw new Error('DB not connected');
    }
    return dbInstance;
}

module.exports = { connectMongo, getDb };
