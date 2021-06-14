"use strict";
class DataGenerator {
    constructor(config) {
        this.$config = config;
    }

    async generateData() {
        try {
            const promises = require('bluebird');
            const n = 49 +  Math.floor(Math.random() * 450);
            let dataPoints = [];
            for(let i = 0; i < n; i++) {
                dataPoints.push(this._generateSingleData());
            }

            dataPoints = await promises.all(dataPoints);
            return dataPoints.join('|');
        }
        catch(error) {
            console.error('DataGenerator::generateData:', error);
            throw error;
        }
    }

    async _generateSingleData() {
        try {
            const crypto = require('crypto');

            // Construct data point
            const person = this._fetchRandom(this.$config.people);
            const origin = this._fetchRandom(this.$config.places);
            const destination = this._fetchRandom(this.$config.places, origin);

            const dataPoint = {
                'name': person,
                'origin': origin,
                'destination': destination
            };

            // generate hash
            const dataPointHash = crypto.createHash("sha256")
                .update(`${dataPoint.name}!${dataPoint.origin}!${dataPoint.destination}`)
                .digest('utf-8');

            dataPoint['secret_key'] = dataPointHash;
            return await this._encrypt(dataPoint);
        }
        catch(error) {
            console.error('DataGenerator::_generateSingleData', error);
            throw error;
        }
    }

    async _encrypt(dataPoint) {
        try {
            const {
                createCipheriv,
                createHash
            } = await import('crypto');

            console.log('encrypting', dataPoint);

            const algorithm = 'aes-256-ctr';
            const password = Buffer.from(this.$config.password, 'utf-8');
            const salt = Buffer.from(this.$config.salt, 'utf-8');
            const key = createHash("sha256").update(password).update(salt).digest();

            const resivedIv = Buffer.allocUnsafe(16);
            const iv = createHash("sha256").update(this.$config.iv).digest();
            iv.copy(resivedIv);

            const cipher = createCipheriv(algorithm, key, resivedIv);
            let encrypted = cipher.update(JSON.stringify(dataPoint), 'utf-8', 'hex');

            encrypted += cipher.final('hex');

            return encrypted;
        }
        catch(error) {
            console.error('DawtaGenerator::_encrypt', error);
            throw error;
        }
    }

    _fetchRandom(list, alreadySelect) {
        let chosen;
        do {
            let idx = Math.floor(Math.random() * list.length);
            chosen = list[idx];
        } while(alreadySelect && alreadySelect === chosen);

        return chosen;
    }
}

module.exports = DataGenerator;