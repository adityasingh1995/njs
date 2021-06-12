const BaseModule = require('./base-module');

class BaseMiddleware extends BaseModule {
    constructor (name, dependences) {
        super(name, dependences);
        const changeCase = require('change-case');
        this.$config = require('./config/middlewares/' + changeCase.paramCase(name));
    }

    start() {
        super.start();
    }

    stop() {
        super.stop();
    }
}

module.exports = BaseMiddleware;