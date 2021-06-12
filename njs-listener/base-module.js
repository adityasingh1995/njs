const EventEmitter = require('events');

class BaseModule extends EventEmitter {
    constructor(name, dependencies) {
        super();
        this.$dependencies = dependencies;
        this.$name = name;
    }

    async start() {
        console.log(`${this.$name}::start`);
    }

    async stop() {
        console.log(`${this.$name}::stop`);
    }
}

module.exports = BaseModule;