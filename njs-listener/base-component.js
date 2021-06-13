const BaseModule = require('./base-module');

class BaseComponent extends BaseModule {
    constructor (name, dependences) {
        super(name, dependences);
        const changeCase = require('change-case');
        this.$config = require(`./config/${nodeEnv}/components/` + changeCase.paramCase(name));
    }

    async start() {
        await super.start();
    }

    async stop() {
        await super.stop();
    }

    async getRoutes() {
    }
}

module.exports = BaseComponent;