"use strict";
const BaseMiddleware = require('../base-middleware');

class DataProcessor extends BaseMiddleware {
    constructor(dependencies) {
        super('DataProcessor', dependencies);
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
    'name': 'DataProcessor',
    'create': DataProcessor,
    'dependencies': [{
        'name': 'TcpServerService',
        'type': 'service'
    }, {
        'name': 'MongoService',
        'type': 'service',
    }, {
        'name': 'RabbitmqService',
        'type': 'service'
    }]
}