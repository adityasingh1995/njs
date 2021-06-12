"use strict";
const BaseService = require('../base-service');

class MongoService extends BaseService {
    constructor(dependencies) {
        super('MongoService', dependencies);
    }

    async start() {
        try {
            await super.start();

            await new Promise((resolve, reject) => {
                setTimeout(resolve, 1500);
            });
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            await new Promise((resolve, reject) => {
                setTimeout(resolve, 1500);
            });

            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }
};

module.exports = {
    'name': 'MongoServiceProcessor',
    'create': MongoService,
    'dependencies': []
}