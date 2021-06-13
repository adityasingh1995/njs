const BaseModule = require('./base-module');

class BaseMiddleware extends BaseModule {
    constructor (name, dependences) {
        super(name, dependences);
        const changeCase = require('change-case');
        this.$config = require(`./config/${nodeEnv}/middlewares/` + changeCase.paramCase(name));
    }

    async start() {
        await super.start();
    }

    async stop() {
        await super.stop();
    }
}

module.exports = BaseMiddleware;