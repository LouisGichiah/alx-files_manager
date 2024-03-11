const { MongoClient } = require('mongodb');

class DBClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';
        this.client = null;
        this.db = null;
    }

    async connect() {
        const uri = `mongodb://${this.host}:${this.port}/${this.database}`;
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await this.client.connect();
        this.db = this.client.db(this.database);
    }

    isAlive() {
        return this.client && this.client.isConnected();
    }

    async nbUsers() {
        const collection = this.db.collection('users');
        const count = await collection.countDocuments();
        return count;
    }

    async nbFiles() {
        const collection = this.db.collection('files');
        const count = await collection.countDocuments();
        return count;
    }
}

const dbClient = new DBClient();
dbClient.connect().catch(console.error);

module.exports = dbClient;
