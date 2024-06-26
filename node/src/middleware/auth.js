const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Scooter = require('../models/scooterModel');
const bcrypt = require('bcrypt');

const auth = {
    verifyToken: async (token) => {
        try {
            const decoded = jwt.verify(token, 'your_jwt_secret');
            const user = await User.findById(decoded.id);
            if (!user || user.activeToken !== token) {
                return null;
            }
            console.log('[AUTH] Token verified');
            return decoded;
        } catch (error) {
            return null;
        }
    },
    getUser: async (token) => {
        const decoded = await auth.verifyToken(token);
        if (!decoded) {
            return null;
        }
        const user = await User.findById(decoded.id);
        if (!user) {
            return null;
        }
        return user;
    },
    signUp: async (data, callback) => {
        try {
            const {username, password} = data;
            const existingUser = await User.findOne({username});
            if (existingUser) {
                return callback({success: false, message: 'Username already exists'});
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({username, password: hashedPassword});
            await newUser.save();
            callback({success: true, message: 'User registered successfully'});
        } catch (error) {
            console.error(error);
            callback({success: false, message: 'Registration failed'});
        }
    },
    login: async (data, callback) => {
        try {
            const {username, password} = data;
            const user = await User.findOne({username});
            if (!user) {
                return callback({success: false, message: 'Invalid username'});
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return callback({success: false, message: 'Invalid username or password'});
            }
            const token = jwt.sign({id: user._id}, 'your_jwt_secret', {expiresIn: '2h'});
            user.activeToken = token;
            await user.save();
            if (user.currentRide !== null) {
                const scooter = await Scooter.findOne({tripId: user.currentRide});
                if (scooter) {
                    return callback({success: true, message:  'Login successful', token,  data: {scooter_id: scooter.id, tripId: scooter.tripId, user: user.username}});
                }
            }
            callback({success: true, message: 'Login successful', token});
        } catch (error) {
            console.error(error);
            callback({success: false, message: 'Login failed'});
        }
    },
    getData: async (token, callback) => {
        let user = await User.findOne({activeToken: token});
        if (!user) {
            return callback({success: false, message: 'Invalid token'});
        }
        let data = {user: user.username, tripId: user.currentRide, token: token};

        if (user.currentRide === null) {
            return callback({success: true, message: 'No active ride', data});
        }
        const tripId = user.currentRide;
        console.log(`[AUTH] Fetching data for trip ${tripId}`);

        const scooter_utilized = await Scooter.findOne({tripId: tripId});
        if (!scooter_utilized) {
            return callback({success: true, message: 'No active ride', data: data});
        }
        data= {...data, scooterId: scooter_utilized.id, tripId: scooter_utilized.tripId};
        callback({success: true, message: 'Data retrieved', data: data});
    },

    getAllUserInfo: async (token, callback) => {
        let user = await User.findOne({activeToken: token});
        if (!user) {
            return callback({success: false, message: 'Invalid token'});
        }
    }
}

module.exports = auth;
