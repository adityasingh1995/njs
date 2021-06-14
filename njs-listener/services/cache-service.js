"use strict";
const safeJsonStringify = require('safe-json-stringify')
const BaseService = require('../base-service');

class CacheService extends BaseService {
    constructor(dependencies) {
        super('CacheService', dependencies);
    }

    async start() {
        try {
			await super.start();
            const redis = require('redis');
            const promises = require('bluebird');

            redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
            redis.Multi.prototype = promises.promisifyAll(redis.Multi.prototype);

            const redisClient = redis.createClient(this.$config.port, this.$config.host);

            redisClient.on('error', this._handleRedisError.bind(this));

            this.$redisClient = redisClient;
		    return null;
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$redisClient) {
                await this.$redisClient.quitAsync()
                this.$redisClient.end(true);
                delete this.$redisClient;
            }

			await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

    _handleRedisError(error) {
        console.error(`${this.name}::_handleRedisError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'CacheService',
    'create': CacheService,
    'dependencies': []
}