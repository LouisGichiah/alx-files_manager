const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

exports.postUpload = async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.client.get(`auth_${token}`);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = '0', isPublic = false, data } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== '0') {
        const parent = await dbClient.db.collection('files').findOne({ _id: parentId });
        if (!parent) {
            return res.status(400).json({ error: 'Parent not found' });
        }
        if (parent.type !== 'folder') {
            return res.status(400).json({ error: 'Parent is not a folder' });
        }
    }

    const fileId = uuidv4();
    const localPath = path.join(FOLDER_PATH, fileId);

    if (type !== 'folder') {
        const fileData = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, fileData);
    }

    const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath: type !== 'folder' ? localPath : undefined,
    };

    await dbClient.db.collection('files').insertOne(newFile);

    res.status(201).json(newFile);
};
