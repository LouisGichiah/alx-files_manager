const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

// Existing code...

exports.getShow = async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.client.get(`auth_${token}`);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const file = await dbClient.db.collection('files').findOne({ _id: id, userId });

    if (!file) {
        return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(file);
};

exports.getIndex = async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.client.get(`auth_${token}`);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = '0', page = 0 } = req.query;
    const files = await dbClient.db.collection('files')
        .find({ userId, parentId })
        .skip(page * 20)
        .limit(20)
        .toArray();

    res.status(200).json(files);
};
