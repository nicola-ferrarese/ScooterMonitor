const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');


const auth  = {
    verifyToken: (token) => {
        try {
            return jwt.verify(token, 'your_jwt_secret');
        } catch (error) {
            return null;
        }
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
                return callback({success: false, message: 'Invalid username or password'});
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return callback({success: false, message: 'Invalid username or password'});
            }
            const token = jwt.sign({id: user._id}, 'your_jwt_secret', {expiresIn: '1h'});
            callback({success: true, message: 'Login successful', token});
        } catch (error) {
            console.error(error);
            callback({success: false, message: 'Login failed'});
        }
    },
    getData: (token, callback) => {
        const decoded = this.verifyToken(token);
        if (!decoded) {
            return callback({success: false, message: 'Invalid token'});
        }
        // Here you can fetch and return data for authenticated users
        callback({success: true, message: 'Data retrieved', data: {}});
    }
}

module.exports = auth;