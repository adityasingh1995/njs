const BaseModule = require('./base-module');

class BaseService extends BaseModule {
    constructor (name, dependences) {
        super(name, dependences);
        const changeCase = require('change-case');
        this.$config = require('./config/services/' + changeCase.paramCase(name));
    }

    start() {
        super.start();
    }

    stop() {
        super.stop();
    }
}

module.exports = BaseService;