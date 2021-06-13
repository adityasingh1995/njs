"use strict";
const BaseService = require('../base-service');

class TcpServerService extends BaseService {
    constructor(dependencies) {
        super('TcpServerService', dependencies);
    }

    async start() {
        try {
            await super.start();
            const net = require('net');
            this.$server = net.createServer((client) => {
                console.log('client connected');

                client.setEncoding('utf-8');

                client.setTimeout(this.$config.clientEndTimeout, () => {
                    console.log('client timeout');
                    client.end();
                });

                setTimeout(() => {
                    client.destroy();
                }, this.$config.clientDestroyTimeout);

                client.on('end', () => {
                    console.log('client disconnected');
                });

                client.on('data', this._handleIncomingData.bind(this));

                client.on('error', (error) => {
                    console.log(`${this.$name}:: client error`, error);
                    client.destroy();
                });
            });

            this.$server.on('error', this._handleServerError.bind(this));

            this.$server.on('close', () => {
                console.log(`${this.$name}::closed`);
            });

            this.$server.maxConnections = this.$config.maxConnections;

            return new Promise((resolve, reject) => {
                this.$server.listen({
                    'port': this.$config.port,
                    'host': this.$config.host
                }, (error) => {
                    if(error) {
                        reject(error);
                    }
                    else {
                        setTimeout(() => {
                            console.log('Server is Listening on port ', this.$config.port)
                        }, 5000);
                        resolve(true);
                    }
                });
            });
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$server) {
                try {
                    await new Promise((resolve, reject) => {
                        this.$server.close((error) => {
                            if(error)
                                reject(error);
                            else
                                resolve();
                        });
                    });
                }
                catch(error) {
                    console.error(`${this.$name}::error closing server`)
                }

                delete this.$server;
            }

            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

    async _handleIncomingData(data) {
        try {
            await this.$dependencies.RabbitmqService.publish('INCOMING', data);
        }
        catch(error) {
            console.error(`${this.$name}::_handleIncomingData`, error);
        }
    }

    async _handleServerError(error) {
        console.error(`${this.$name}::_handleServerError`, error);
        this.emit('error', error);
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