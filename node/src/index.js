const express = require('express');
const { connectMongo } = require('./db/mongoConnection');
const userRoutes = require('./routes/userRoutes');
const scooterRoutes = require('./routes/scooterRoutes');
const { connectKafka } = require('./kafka');
const {initSocket} = require('./middleware/socket');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const cors = require('cors');

let io = null


app.use(express.json());
app.use(cors());
// app.use('/users', userRoutes);
app.use('/api/scooter', scooterRoutes);

(async () => {
    io = initSocket(server);
    await connectMongo();
    await connectKafka();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();

module.exports = io;


