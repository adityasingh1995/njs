"use strict";
const TcpServerService = require('./tcp-server-service');
const MongoService = require('./mongo-service');
const RabbitmqService = require('./rabbitmq-service');
const WebserverService = require('./webserver-service');

module.exports = {
    TcpServerService,
    MongoService,
    RabbitmqService,
    WebserverService
};