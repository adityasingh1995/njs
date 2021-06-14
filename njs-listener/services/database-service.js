"use strict";
const safeJsonStringify = require('safe-json-stringify')
const BaseService = require('../base-service');

class DatabaseService extends BaseService {
    constructor(dependencies) {
        super('DatabaseService', dependencies);
    }

    async start() {
        try {
			await super.start();

			this.$config.debug = (this.$config.debug === true);
			if(this.$config.connection)
                this.$config.connection.port = Number(this.$config.connection.port);

			if(this.$config.pool) {
				this.$config.pool.min = Number(this.$config.pool.min);
				this.$config.pool.max = Number(this.$config.pool.max);

				this.$config.pool['afterCreate'] = async function(rawConnection, done) {
					try {
						const pgError = require('pg-error');

						rawConnection.connection.parseE = pgError.parse;
						rawConnection.connection.parseN = pgError.parse;

						rawConnection.connection.on('PgError', function(err) {
							switch (err.severity) {
								case 'ERROR':
								case 'FATAL':
								case 'PANIC':
									this.emit('error', err);
									break;

								default:
									this.emit('notice', err);
									break;
							}
						});

						const promises = require('bluebird');
						promises.promisifyAll(rawConnection.connection);
						done();
					}
					catch(err) {
						done(err);
					}
				};
			}

			const knex = require('knex');
			const knexInstance = knex(this.$config);
			knexInstance.on('query-error', this._databaseQueryError.bind(this));

            this.$knex = knexInstance;
			return null;
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$knex) {
    			await this.$knex.destroy();
			    delete this.$knex;
            }

			await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

	_databaseQueryError(error, query) {
		const queryLog = { 'sql': query.sql, 'bindings': query.bindings, 'options': query.options };
		console.log(`${this.$name}::_databaseQueryError:\nQuery: ${safeJsonStringify(queryLog, null, '\t')}\nError: ${safeJsonStringify(error, null, '\t')}`);
	}
};

module.exports = {
    'name': 'DatabaseService',
    'create': DatabaseService,
    'dependencies': []
}