"use strict";

process.title = 'njs-listener';

global.snooze = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

process.on('uncaughtException', (err) => {
	console.error(`Uncaught Exception: ${err.message}\n${err.stack}`);
	process.exit(1); // eslint-disable-line no-process-exit
});

process.on('unhandledRejection', (reason, location) => {
	console.error(`Unhandled Rejection: ${reason} at:`, location);
	process.exit(1); // eslint-disable-line no-process-exit
});


let shuttingDown = false;
let serverInstance = null;

const onDeath = require('death')({ 'uncaughtException': false, 'debug': true });
const offDeath = onDeath(async () => {
	if(shuttingDown) return;
	shuttingDown = true;

    if(interval)
    clearInterval(interval);

    if(serverInstance)
        await serverInstance.stop();

	offDeath();
	process.exit(0); // eslint-disable-line no-process-exit
});

const ApplicationServer = require('./application-server');

const start = async () => {
    try {
        serverInstance = new ApplicationServer();
        serverInstance.on('error', (error) => {
            console.error('Server Error', error);
            serverInstance.stop();
        });

        await serverInstance.start();
    }
    catch(error) {
        console.error('Start Error', error);
        throw error;
    }
};

start();