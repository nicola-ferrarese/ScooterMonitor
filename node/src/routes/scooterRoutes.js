
const express = require('express');
const router = express.Router();
const { createScooter, readScooter, updateScooter, deleteScooter } = require('../db/mongoOperations');
const { sendKafkaMessage } = require('../kafka/producer');

router.get('/:id', async (req, res) => {
    try {
        const scooter = await readScooter(req.params.id);
        if (!scooter) {
            return res.status(404).json({ message: 'Scooter not found' });
        }
        res.status(200).json(scooter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        console.log(`Updating scooter: %o , id: %o `, req.body, req.params.id);
        if (req.params.id === "all")
            for (const item of ["1_1", "1_2", "1_3", "1_4", "1_5", "1_6", "1_7", "1_8", "1_9", "1_10"]) {
                let body = {id: item, ...req.body}
                console.log(`Sending message to scooter: %o`, item);
                const outcome = await sendKafkaMessage(item, body);
                if (!outcome) {
                    res.status(404).json({message: 'Something went wrong while sending message'});
                }
            }

        const outcome = await sendKafkaMessage(req.params.id, req.body);
        if (!outcome) {
            return res.status(404).json({ message: 'Something went wrong while sending message' });
        }
        console.log(`Message sent: %o`, req.body);
        res.status(200).json({ message: 'Message sent' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
