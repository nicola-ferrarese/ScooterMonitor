const express = require('express');
const { connectMongo } = require('./db/mongoConnection');
const userRoutes = require('./routes/userRoutes');
const scooterRoutes = require('./routes/scooterRoutes');
const { connectKafka } = require('./kafka');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// app.use('/users', userRoutes);
app.use('/api/scooter', scooterRoutes);

(async () => {
    await connectMongo();
    await connectKafka();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
