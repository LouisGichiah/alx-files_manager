const Queue = require('bull');
const sharp = require('sharp'); // Import sharp
const path = require('path');
const fs = require('fs');
const dbClient = require('../utils/db'); // Assuming you have a dbClient setup

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    if (!fileId || !userId) {
        throw new Error('Missing fileId or userId');
    }

    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
    if (!file) {
        throw new Error('File not found');
    }

    const thumbnailSizes = [500, 250, 100];
    const filePath = path.join(FOLDER_PATH, file.localPath); // Assuming FOLDER_PATH is defined elsewhere

    for (const size of thumbnailSizes) {
        const thumbnailPath = path.join(FOLDER_PATH, `${file.localPath}_${size}`);
        await sharp(filePath)
            .resize(size)
            .toFile(thumbnailPath);
    }
});

module.exports = fileQueue;

