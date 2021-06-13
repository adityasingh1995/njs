"use strict";
const BaseService = require('../base-service');

class WebserverService extends BaseService {
    constructor(dependencies) {
        super('WebserverService', dependencies);
    }

    async start() {
        try {
            await super.start();

            // Cache 
            const redis = require('redis');
            const promises = require('bluebird');
            redis.RedisClient.prototype = promises.promisifyAll(redis.RedisClient.prototype);
            redis.Multi.prototype = promises.promisifyAll(redis.Multi.prototype);
            const redisClient = redis.createClient(this.$config.redis.port, this.$config.redis.host);
            redisClient.on('error', this._handleRedisError.bind(this));
            this.$redisClient = redisClient;

            // Koa
            const Koa = require('koa');
            const app = new Koa();
            this.$app = app;
            app.keys = [this.$config.sessionSecretKey];

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

            app.use(router.routes()).use(router.allowedMethods());

            this.$server = app.listen(this.$config.port);
            const serverDestroy = require('server-destroy');
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
            if(this.$redisClient) {
                await this.$redisClient.quitAsync()
                this.$redisClient.end(true);
                delete this.$redisClient;
            }

            if(this.$server) {
                this.$server.destroyAsync();
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
            this.$app.user(router.allowedMethods());
        }
        catch(error) {
            console.error(`${this.$name}::addRoutes`, error);
            throw error;
        }
    }

    _handleKoaError(error) {
        console.error(`${this.name}::_handleKoaError`, error);
        this.emit('error', error);
    }

    _handleServerError(error) {
        console.error(`${this.name}::_handleServerError`, error);
        this.emit('error', error);
    }

    _handleRedisError(error) {
        console.error(`${this.name}::_handleRedisError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'WebserverService',
    'create': WebserverService,
    'dependencies': []
}