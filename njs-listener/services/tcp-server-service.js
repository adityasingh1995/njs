"use strict";
const BaseService = require('../base-module');

class TcpServerService extends BaseService {
    constructor(dependencies) {
        super('TcpServerService', dependencies);
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
            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }
};

module.exports = {
    'name': 'TcpServerService',
    'create': TcpServerService,
    'dependencies': [{
        'type': 'service',
        'name': 'RabbitmqService'
    }]
}