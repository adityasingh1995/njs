const BaseModule = require('./base-module');

class BaseService extends BaseModule {
    constructor (name, dependences) {
        super(name, dependences);
        const changeCase = require('change-case');
        this.$config = require(`./config/${nodeEnv}/services/` + changeCase.paramCase(name));
    }

    async start() {
        await super.start();
    }

    async stop() {
        await super.stop();
    }
}

module.exports = BaseService;