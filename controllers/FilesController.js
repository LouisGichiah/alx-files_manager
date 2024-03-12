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
exports.putPublish = async (req, res) => {
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

    await dbClient.db.collection('files').updateOne({ _id: id }, { $set: { isPublic: true } });
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: id });

    res.status(200).json(updatedFile);
};

exports.putUnpublish = async (req, res) => {
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

    await dbClient.db.collection('files').updateOne({ _id: id }, { $set: { isPublic: false } });
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: id });

    res.status(200).json(updatedFile);
};
exports.getFile = async (req, res) => {
    const { id } = req.params;
    const file = await dbClient.db.collection('files').findOne({ _id: id });

    if (!file) {
        return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    if (!file.isPublic) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(404).json({ error: 'Not found' });
        }

        const userId = await redisClient.client.get(`auth_${token}`);
        if (!userId || userId !== file.userId) {
            return res.status(404).json({ error: 'Not found' });
        }
    }

    const filePath = path.join(FOLDER_PATH, file.localPath);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
    }

    const fileContent = fs.readFileSync(filePath);
    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.send(fileContent);
};
exports.getFile = async (req, res) => {
    const { id } = req.params;
    const { size } = req.query;
    const file = await dbClient.db.collection('files').findOne({ _id: id });

    if (!file) {
        return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    // Existing code...

    if (size && thumbnailSizes.includes(parseInt(size))) {
        const thumbnailPath = `${file.localPath}_${size}`;
        if (!fs.existsSync(thumbnailPath)) {
            return res.status(404).json({ error: 'Not found' });
        }
        const fileContent = fs.readFileSync(thumbnailPath);
        const mimeType = mime.lookup(file.name) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.send(fileContent);
    } else {
        const filePath = path.join(FOLDER_PATH, file.localPath);
if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
}
const fileContent = fs.readFileSync(filePath);
const mimeType = mime.lookup(file.name) || 'application/octet-stream';
res.setHeader('Content-Type', mimeType);
res.send(fileContent);
    }
};
