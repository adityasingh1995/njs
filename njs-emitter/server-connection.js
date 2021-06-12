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
			await new Promise((resolve, reject) => {
				try {
					const connectedPromise = new Promise((resolve, reject) => {
						try {
							this.$socket.once('connect', resolve);
						}
						catch(err) {
							reject(err);
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
						this.$socket.end();
						reject(error);
					});

					this.$socket.connect(this.$endPoint);

					await connectedPromise;

					this.$socket.write(data, 'utf-8', () => {;
						this.$socket.end();
						resolve(true);
					});
				}
				catch(err) {
					reject(err);
				}
			});
		}
		catch(error) {
			console.error('Socket Interface startup error', error);
			throw err;
		}
	}

	stop() {
		if(this.$socket)
			this.$socket().end();
	}
}

module.exports = ServerConnection;
