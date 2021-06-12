"use strict";

process.title = 'njs-emitter';

global.snooze = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

global.nodeEnv = (process.env.NODE_ENV || 'development').toLocaleLowerCase();

process.on('uncaughtException', (err) => {
	console.error(`Uncaught Exception: ${err.message}\n${err.stack}`);
	process.exit(1); // eslint-disable-line no-process-exit
});

process.on('unhandledRejection', (reason, location) => {
	console.error(`Unhandled Rejection: ${reason} at:`, location);
	process.exit(1); // eslint-disable-line no-process-exit
});


// Define end points
const config = require(`./config/${nodeEnv}/config.js`);
const endPoints = config.endPoints;

let shuttingDown = false;
let interval = null;

const onDeath = require('death')({ 'uncaughtException': false, 'debug': true });
const offDeath = onDeath(() => {
	if(shuttingDown) return;
	shuttingDown = true;

    if(interval)
    clearInterval(interval);

	for(let endPoint of endPoints) {
		try {
			if(!endPoint.interface) continue;
			endPoint.interface.stop();
		}
		catch(error) {
			console.error(`Shutdown Exception::Endpoint: ${endPoint.connection.host}\nMessage: ${error.message}\nStack:\n${error.stack}`);
		}
	}

	offDeath();
	process.exit(0); // eslint-disable-line no-process-exit
});

const ServerConnectionInterface = require('./server-connection');
const DataGenerator = require('./data-generator.js')
const dataGenerator = new DataGenerator(config.generator);

const pingServers = async () => {
    try {
        const data = await dataGenerator.generateData()
        console.log('Generated data', data);
        for(let endPoint of endPoints) {
            try {
                await endPoint.interface.sendData(data);
            }
            catch(error) {
                console.error('Error Sending Data', error);
            }
        }
    }
    catch(error) {
        console.error('Ping Error', error);
    }
}

const start = async () => {
    try {
        for(let endPoint of endPoints) {
            endPoint.interface = new ServerConnectionInterface(endPoint.connection);
        }

        interval = setInterval(pingServers, 10000);
        pingServers();
    }
    catch(error) {
        console.error('Start Error', error);
        throw error;
    }
};

start();