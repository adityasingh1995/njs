"use strict";
const BaseService = require('../base-service');

class MongoService extends BaseService {
    constructor(dependencies) {
        super('MongoService', dependencies);
    }

    async start() {
        try {
            await super.start();

            const { MongoClient } = require("mongodb");
            const uri = `mongodb://${this.$config.user}:${this.$config.password}@${this.$config.host}:${this.$config.port}/?poolSize=${this.$config.pool}&writeConcern=majority`;
            this.$uri = uri;
            const client = new MongoClient(uri);
            this.$client = client;

            client.on('error', this._handleMongoError.bind(this));
            await client.connect();

            this.$db = this.$client.db(this.$config.dbName);
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$client) {
                await this.$client.close();
                delete this.$client;
            }
            
            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

    _handleMongoError(error) {
        console.error(`${this.$name}::_handleMongoError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'MongoService',
    'create': MongoService,
    'dependencies': []
}