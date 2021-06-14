"use strict";
const BaseModule = require('./base-module');

class ApplicationServer extends BaseModule {
    constructor() {
        super('NJS-Listener', null);
        this.$services = {};
        this.$middlewares = {};
        this.$components = {};

        this.$loadOrder = [];
        this.errored = false;
    }

    async start() {
        try {
            await super.start();
            // load services
            const services = require('./services');
            const servicesNames = Object.keys(services);

            for(let service of servicesNames) {
                await this._loadService(services[service]);
            }

            // load middlewares
            const middlewares = require('./middlewares');
            const middlewaresNames = Object.keys(middlewares);

            for(let middleware of middlewaresNames) {
                await this._loadMiddleware(middlewares[middleware]);
            }

            // load Components 
            const components = require('./components');
            const componentsNames = Object.keys(components);

            for(let component of componentsNames) {
                await this._loadComponent(components[component]);
            }
        }
        catch(error) {
            console.error('ApplicationServer::start', error)
            throw error;
        }
    }

    async _loadService(serviceToLoad) {
        try {
            if(this.errored)
                return;

            if(this.$services[serviceToLoad.name])
                return;

            const loadedDeps = {};

            for(let dep of serviceToLoad.dependencies) {
                await this._loadService(require('./services')[dep.name]);
                loadedDeps[dep.name] = this.$services[dep.name];
            }

            this.$services[serviceToLoad.name] = new serviceToLoad.create(loadedDeps);
            this.$services[serviceToLoad.name].on('error', this._onServiceError.bind(this, serviceToLoad.name));
            this.$loadOrder.push(this.$services[serviceToLoad.name])

            await this.$services[serviceToLoad.name].start();
            console.log(`${serviceToLoad.name}::started`)
        }
        catch(error) {
            console.error('ApplicationServer::_loadService', error)
            throw error;
        }
    }

    async _loadMiddleware(middlewareToLoad) {
        try {
            if(this.errored)
                return;

            if(this.$middlewares[middlewareToLoad.name])
                return;

            const loadedDeps = {};

            for(let dep of middlewareToLoad.dependencies) {
                if(dep.type === 'middleware') {
                    await this._loadMiddleware(require('./middlewares')[dep.name]);
                    loadedDeps[dep.name] = this.$middlewares[dep.name];
                }

                if(dep.type === 'service') {
                    loadedDeps[dep.name] = this.$services[dep.name];
                }
            }

            this.$middlewares[middlewareToLoad.name] = new middlewareToLoad.create(loadedDeps);
            this.$middlewares[middlewareToLoad.name].on('error', this._onMiddlewareError.bind(this, middlewareToLoad.name));
            this.$loadOrder.push(this.$middlewares[middlewareToLoad.name]);

            await this.$middlewares[middlewareToLoad.name].start();
            console.log(`${middlewareToLoad.name}::started`)
        }
        catch(error) {
            console.error('ApplicationServer::_loadMiddleware', error)
            throw error;
        }
    }

    async _loadComponent(componentToLoad) {
        try {
            if(this.errored)
                return;

            if(!this.$services['WebserverService'])
                return;

            const loadedDeps = {};

            for(let dep of componentToLoad.dependencies) {
                if(dep.type === 'middleware') {
                    loadedDeps[dep.name] = this.$middlewares[dep.name];
                }

                if(dep.type === 'service') {
                    loadedDeps[dep.name] = this.$services[dep.name];
                }
            }

            this.$components[componentToLoad.name] = new componentToLoad.create(loadedDeps);
            this.$components[componentToLoad.name].on('error', this._onComponentError.bind(this, componentToLoad.name));
            this.$loadOrder.push(this.$components[componentToLoad.name]);

            const routes = await this.$components[componentToLoad.name].getRoutes();
            this.$services['WebserverService'].addRoutes(routes);
            console.log(`${componentToLoad.name}::started`);
        }
        catch(error) {
            console.error('ApplicationServer::_loadComponents', error)
            throw error;
        }
    }

    async stop() {
        try {
            while(this.$loadOrder.length) {
                try {
                    const module = this.$loadOrder.pop();
                    await module.stop();
                }
                catch(err) {
                    console.error('Error stoping module', err);
                }
            }

            await super.stop();
        }
        catch(error) {
            console.error('ApplicationServer::stop', error)
            throw error;
        }
    }

    _onServiceError(name, error) {
        this.errored = true;
        console.error(`servirce error:${name}`, error);
        this.emit('error', error);
    }

    _onMiddlewareError(name, error) {
        this.errored = true;
        console.error(`middleware error${name}`, error);
        this.emit('error', error);
    }

    _onComponentError(name, error) {
        this.errored = true;
        console.error(`component error${name}`, error);
        this.emit('error', error);
    }
}

module.exports = ApplicationServer;