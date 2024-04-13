const { updateScooter } = require('../db/mongoOperations');

const handleScooterCommand = async (id, command) => {
    try {
        const result = await updateScooter(id, command);
        console.log(`Update result: ${result.matchedCount} matched, ${result.modifiedCount} modified`);
    }
    catch (e) {
        console.error(e);
    }
}
