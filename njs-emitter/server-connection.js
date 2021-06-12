'use strict';

class ServerConnection {
	// #region Constructor
	constructor(endPoint) {
		this.$endPoint = endPoint;
	}
	// #endregion

	// #region Public API
	async sendData(data) {
		try {
			const net = require('net');
			this.$socket = new net.Socket();
			await new Promise(async (resolve, reject) => {
				try {
					console.log('Connecting to server..');
					const connectedPromise = new Promise((resolve, reject) => {
						try {
							console.log('socket connected');
							this.$socket.once('connect', resolve);
						}
						catch(error) {
							reject(error);
						}
					});

					this.$socket.on('close', () => {
						if(this.$socket) {
							this.$socket.destroy();
							delete this.$socket;
						}
					});

					this.$socket.on('error', (error) => {
						console.error(`Socket Error for endPoint: ${this.$endPoint.host}: ${error.message}\nStack:${error.stack}`);
						this.$socket.destroy();
						reject(error);
					});

					this.$socket.connect(this.$endPoint);

					await connectedPromise;

					console.log('writing data');
					this.$socket.write(data, 'utf-8', () => {;
						this.$socket.end();
						console.log('Write finished');
						resolve(true);
					});
				}
				catch(error) {
					reject(error);
				}
			});
		}
		catch(error) {
			console.error('Socket Interface startup error', error);
			throw error;
		}
	}

	stop() {
		if(this.$socket)
			this.$socket().end();
	}
}

module.exports = ServerConnection;
