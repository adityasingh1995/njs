"use strict"
const BaseComponent = require('../base-component');
class Users extends BaseComponent {
    constructor(dependencies) {
        super("Users", dependencies);
    }

    async getRoutes() {
        try {

        }
        catch(error) {
            console.error(`${this.$name}::getRoutes`, error);
            throw error;
        }
    }
};

module.exports = {
    'name': 'Users',
    'create': Users,
    'dependencies': [{
        'type': 'service',
        'name': 'DatabaseService'
    }]
}