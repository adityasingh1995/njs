"use strict";
const BaseMiddleware = require('../base-middleware');
const moment = require('moment');
const { reject } = require('bluebird');
const { resolve } = require('path');
class DataProcessor extends BaseMiddleware {
    constructor(dependencies) {
        super('DataProcessor', dependencies);
    }

    async start() {
        try {
            await super.start();
            await this.$dependencies.RabbitmqService.subscribe('INCOMING', this._handleIncomingData.bind(this));
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            await this.$dependencies.RabbitmqService.unsubscribe('INCOMING', this._handleIncomingData.bind(this));
            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

    async _handleIncomingData(topic, encryptedData) {
        try {
            const promises = require('bluebird');
            const dataPointList = encryptedData.split('|');
            let decryptedData = [];

            for(let i = 0; i < dataPointList.length; i++) {
                decryptedData.push(this._decrypt(dataPointList[i]));
            }

            decryptedData = await promises.all(decryptedData);

            decryptedData = decryptedData.filter((d) => {
                return d !== null;
            });

            for(let i = 0; i < decryptedData.length; i++) {
                await promises.all([
                    this._persistData(decryptedData[i]),
                    this._publishToFrontend(decryptedData[i])
                ]);
            }
        }
        catch(error) {
            console.error(`${this.$name}::_handleIncomingData`, error);
            throw error;
        }
    }

    async _persistData(data) {
        try {
            const db = this.$dependencies.MongoService.$db;
            const currentTime = moment();
            data['timestamp'] = moment().format();
            const minuteTime = currentTime.clone().seconds(0).milliseconds(0).valueOf();
            const name = data.name;

            const tripsCollection = db.collection('trips');

            let alreadyExistingDocument = await tripsCollection.find({
                'name': name,
                'time': minuteTime
            }).toArray();

            if(!alreadyExistingDocument || !alreadyExistingDocument.length) {
                await tripsCollection.insertOne({
                    'name': name,
                    'time': minuteTime,
                    'stream': [data]
                });
            }
            else {
                await tripsCollection.updateOne({
                    'name': name,
                    'time': minuteTime
                }, {
                    $push: {
                        'stream': data
                    }
                });
            }
        }
        catch(err) {
            console.error(`${this.$name}::_persistData`, error);
            throw error;
        }
    }

    async _decrypt(encryptedData) {
        try {
            const {
                createDecipheriv,
                createHash
            } = await import('crypto');

            const algorithm = 'aes-256-ctr';
            const password = Buffer.from(this.$config.password, 'utf-8');
            const salt = Buffer.from(this.$config.salt, 'utf-8');
            const key = createHash("sha256").update(password).update(salt).digest();

            const resizedIv = Buffer.allocUnsafe(16);
            const iv = createHash("sha256").update(this.$config.iv).digest();
            iv.copy(resizedIv);

            const decipher = createDecipheriv(algorithm, key, resizedIv);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');

            decrypted += decipher.final('utf-8');

            decrypted = await this._checkIntegrity(decrypted);
            return decrypted;
        }
        catch(error) {
            console.error(`${this.$name}::_decrypt`, error)
            return null;
        }
    }

    async _checkIntegrity(decrypted) {
        try {
            const parsedData = JSON.parse(decrypted);

            if(typeof parsedData !== 'object')
                return null;

            if(!parsedData['secret_key'])
                return null;

            if(!parsedData['name'] || !parsedData['origin'] || !parsedData['destination'])
                return null;

            const {
                createHash
            } = await import('crypto');

            const generatedHash = createHash("sha256")
                .update(`${parsedData.name}!${parsedData.origin}!${parsedData.destination}`)
                .digest('utf-8');

            if(generatedHash === parsedData.secret_key)
                return parsedData;

            return null;
        }
        catch(error) {
            console.error(`${this.name}::_checkIntegriy`, error);
            throw error;
        }
    }

    async _publishToFrontend(data) {
        try {
            console.log('publishing', data);
        }
        catch(error) {
            console.error(`${this.name}::_publishToFrontend`, error);
        }
    }
};

module.exports = {
    'name': 'DataProcessor',
    'create': DataProcessor,
    'dependencies': [{
        'name': 'MongoService',
        'type': 'service',
    }, {
        'name': 'RabbitmqService',
        'type': 'service'
    }]
}