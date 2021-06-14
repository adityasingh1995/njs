"use strict";
const BaseService = require('../base-service');

class WebserverService extends BaseService {
    constructor(dependencies) {
        super('WebserverService', dependencies);
    }

    async start() {
        try {
            await super.start();
            const redisClient = this.$dependencies.CacheService.$redisClient;
            const knex = this.$dependencies.DatabaseService.$knex;

            // Koa
            const Koa = require('koa');
            const app = new Koa();
            this.$app = app;
            app.keys = [this.$config.sessionSecretKey];

            // static
            const staticFiles = new Koa();
            const path = require('path');
            const serve = require('koa-static');
            const mount = require("koa-mount");

            staticFiles.use(serve(path.join(path.dirname(__dirname), "/frontend"))); //serve the build directory
            app.use(mount("/", staticFiles));
           
            const cookieFieldName = this.$config.cookieName;
            const bodyParser = require('koa-bodyparser');
            app.use(bodyParser());

            // session
            app.use(async (ctxt, next) => {
                const sessionId = ctxt.cookies.get(cookieFieldName, {
                    'signed': true
                });

                if(!sessionId) {
                    await next();
                    return;
                }

                let sessionData = await redisClient.getAsync(sessionId);

                if(!sessionData) {
                    ctxt.cookies.set(cookieFieldName);
                    await next();
                    return;
                }

                sessionData = JSON.parse(sessionData);

                let user = await knex.raw('SELECT id, user_name, name FROM users WHERE id = ?', [sessionData.user_id]);
                user = user.rows.length ? user.rows.shift() : null;

                if(!user){
                    redisClient.del(sessionId);
                    ctxt.cookies.set(cookieFieldName);
                    await next();
                    return;
                }

                await redisClient.setexAsync(sessionId, (this.$config.maxAge), JSON.stringify(sessionData));

                ctxt.cookies.set(cookieFieldName, sessionId, {
                    'maxAge': (this.$config.maxAge),
                    'signed': true,
                    'secure': false,
                    'httpOnly': true,
                    'overwrite': true	
                });

                ctxt.state.user = user;
                await next();
            });


            //serve static files
            /*
            const Router = require('koa-router');
            const router = new Router();
            const send = require('koa-send');

            router.get('/public', async (ctxt, next) => {
                console.log('hit');
                const path = require('path');
                const root = path.join(path.dirname(__dirname), 'frontend/public');
                console.log(root, ctxt.path);
                const filePath = path.relative('/public', ctxt.path);

                if(!filePath) {
                    ctxt.throw(404, 'No Path Specified');
                    return;
                }
                await send(ctxt, filePath, { root: root});
            });

            router.get('/', async (ctxt, next) => {
                await send(ctxt, '../frontend/index.html');
            });

            app.use(router.routes()).use(router.allowedMethods());
            */

            // listen
            const serverDestroy = require('server-destroy');
            const http = require('http');

            this.$server = http.createServer(app.callback());
            this.$server.listen(this.$config.port);
            serverDestroy(this.$server);

			this.$app.on('error', this._handleKoaError.bind(this));
			this.$server.on('error', this._handleServerError.bind(this));

            console.log(`${this.$name}::listening on `, this.$config.port);
        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$server) {
                this.$server.destroy();
                delete this.$server;
            }

            delete this.$app;
            await super.stop();
        }
        catch(error) {
            console.error(`${this.$name}::stop:`, error);
            throw error;
        }
    }

    async addRoutes(router) {
        try {
            this.$app.use(router.routes());
            this.$app.use(router.allowedMethods());
        }
        catch(error) {
            console.error(`${this.$name}::addRoutes`, error);
            throw error;
        }
    }

    _handleKoaError(error) {
        console.error(`${this.name}::_handleKoaError`, error);
    }

    _handleServerError(error) {
        console.error(`${this.name}::_handleServerError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'WebserverService',
    'create': WebserverService,
    'dependencies': [{
        'type': 'service',
        'name': 'CacheService'
    }, {
        'type': 'service',
        'name': 'DatabaseService'
    }]
}