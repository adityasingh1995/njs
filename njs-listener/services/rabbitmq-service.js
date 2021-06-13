"use strict";
const BaseService = require('../base-service');

class RabbitmqService extends BaseService {
    constructor(dependencies) {
        super('RabbitmqService', dependencies);
    }

    async start() {
        try {
            await super.start();
            const AMQPLib = require('amqplib');

            const connection = await AMQPLib.connect(this.$config);
            connection.on('error', this._handleAmqpError.bind(this));

            this.$listener = {
                'connected': true,
                'connection': connection,
                'publish_client': await connection.createChannel(),
                'subscribe_client': await connection.createChannel()
            };

            this.$listener['publish_client'].on('error', this._handleAmqpError.bind(this));

            // this.$listener['subscribe_client'].prefetch(10);
            this.$listener['subscribe_client'].on('error', this._handleAmqpError.bind(this));

            this.$listener['publish_client'].once('error', () => {
                this.$listener['connected'] = false;
            });

            this.$listener['subscribe_client'].once('error', () => {
                this.$listener['connected'] = false;
            });

            if(this.$config['prefetch'])
                await this.$listener['subscribe_client'].prefetch(this.$config['prefetch']);

			return null;
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$listener) {
                if(this.$listener['publish_client'])
                    await this.$listener['publish_client'].close();

                if(this.$listener['subscribe_client'])
                    await this.$listener['subscribe_client'].close();

                if(this.$listener['connection'])
                    await this.$listener['connection'].close();

                delete this.$listener;
            }
            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

	async publish(topic, data) {
		try {
			const channel = this.$listener['publish_client'];
			const exchange = this.$config['exchange'];

			await channel.checkQueue(topic);

			const pubStatus = await channel.publish(exchange, topic, Buffer.from(data, 'utf-8'));

			if(!pubStatus) {
				throw new Error(`Channel Buffer Full: ${topic}`);
			}
		}
		catch(error) {
            console.error(`${this.$name}::publish:`, error);
            throw error;
		}
	}

	async subscribe(topic, listener) {
		try {
            const channel = this.$listener['subscribe_client'];
            const exchange = this.$config['exchange'];
            const exchangeType = this.$config['exchangeType'];

            await channel.assertExchange(exchange, exchangeType, {
                'durable': true
            });

            await channel.checkQueue(topic);

            if(!this.$listener['subscribers'])
                this.$listener['subscribers'] = {};

            if(!this.$listener['subscribers'][topic])
                this.$listener['subscribers'][topic] = {
                    'consumers': [],
                    'consumerId': null
                };

            if(!this.$listener['subscribers'][topic]['consumerId']) {
                const consumeResult = await channel.consume(topic, this._handleAmqpMessage.bind(this));
                this.$listener['subscribers'][topic]['consumerId'] = consumeResult['consumerTag'];
            }

            this.$listener['subscribers'][topic]['consumers'].push(listener);

			return null;
		}
		catch(error) {
            console.error(`${this.$name}::subscribe:`, error);
            throw error;
		}
	}

	async unsubscribe(topic, listener) {
		try {
            if(this.$listener['subscribers'] && this.$listener['subscribers'][topic]) {
                const channel = this.$listener['subscribe_client'];

                const listenerIdx = this.$listener['subscribers'][topic]['consumers'].indexOf(listener);
                if(listenerIdx >= 0) this.$listener['subscribers'][topic]['consumers'].splice(listenerIdx, 1);

                if(!this.$listener['subscribers'][topic]['consumers'].length) {
                    await channel.cancel(this.$listener['subscribers'][topic]['consumerId']);
                    this.$listener['subscribers'][topic]['consumerId'] = null;
                }

            }
		}
		catch(error) {
            console.error(`${this.$name}::unsubscribe:`, error);
            throw error;
		}
	}

	async _handleAmqpMessage(message) {
		const topic = message.fields.routingKey;
		const messageContent = message.content.toString('utf-8');

		try {
			if(!this.$listener)
				throw new Error(`No Listeners`);

			if(!this.$listener['subscribers'][topic])
				throw new Error(`Unsubscribed Topic: ${topic}`);
		}
		catch(error) {
			if(this.$listener && this.$listener['subscribe_client']) {
				this.$listener['subscribe_client'].ack(message);
			}

            console.error(`${this.$name}::_handleAmqpMessage:`, error)
			return;
		}

		try {
			let cleanExecutions = 0;

			for(let idx = 0; idx < this.$listener['subscribers'][topic]['consumers'].length; idx++) {
				const consumer = this.$listener['subscribers'][topic]['consumers'][idx];

				try {
					await consumer(topic, messageContent);
					cleanExecutions++;
				}
				catch(error) {
					console.error(`${this.$name}::_handleAmqpMessage: consumer error`, error);
				}
			}

			if(cleanExecutions) {
				this.$listener['subscribe_client'].ack(message);
			}
			else {
				this.$listener['subscribe_client'].nack(message, false, true);
				throw new Error(`All Consumers Failed To process message for Topic "${topic}"::Message: ${messageContent}`);
			}
		}
		catch(error) {
			console.error(`${this.$name}::_handleAmqpMessage`, error);
		}
	}

    async _handleAmqpError(error) {
        console.error(`${this.name}::_handleAmqpError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'RabbitmqService',
    'create': RabbitmqService,
    'dependencies': []
};