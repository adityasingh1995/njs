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
            for(let i = 0; i < 2; i++) {
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
                randomFill,
                createCipheriv,
                randomBytes,
                createHash
            } = await import('crypto');

            const algorithm = 'aes-256-ctr';
            const password = Buffer.from(this.$config.password, 'utf-8');

            const salt = randomBytes(16);

            const key = createHash("sha256").update(password).update(salt).digest();

            return new Promise((resolve, reject) => {
                randomFill(new Uint8Array(16), (error, iv) => {
                    if (error) throw reject(error);
                    const cipher = createCipheriv(algorithm, key, iv);

                    let encrypted = cipher.update(JSON.stringify(dataPoint), 'utf-8', 'hex');
                    encrypted += cipher.final('hex');

                    resolve(encrypted);
                });
            });
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