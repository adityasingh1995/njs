"use strict";
const BaseService = require('../base-service');

class WebserverService extends BaseService {
    constructor(dependencies) {
        super('WebserverService', dependencies);
    }

    async start() {
        try {
            await super.start();

            const express = require("express");
            const app = express();
            const session = require("express-session");
            const MongoDBStore = require("connect-mongodb-session")(session);
            const router = express.Router();
            const morgan = require("morgan");
            const path = require("path");
            const helmet = require('helmet');
            const cors = require('cors');

            this.$app = app;
            app.on('error', this._handleExpressError.bind(this));

            const mongoDBstore = new MongoDBStore({
                "uri": this.$dependencies.MongoService.$uri,
                "collection": "mySessions"
            });

            this.$mongoStore = mongoDBstore;
            mongoDBstore.on('error', this._handleMongoError.bind(this));

            app.use(express.urlencoded({ extended: false }));
            app.use(express.json());

            app.use(morgan("dev"));

            app.use(
                session({
                    name: this.$config.cookieName, 
                    secret: this.$config.sesionSecretKey,
                    resave: true,
                    saveUninitialized: false,
                    store: mongoDBstore,
                    cookie: {
                    maxAge: this.$config.maxAge,
                    sameSite: false,
                    secure: (nodeEnv === 'production')
                    }
                })
            );

            app.use(helmet());

            const corsOptions = {
                origin: (nodeEnv === 'production') ? 'http://localhost' : 'http://localhost:3000',
                credentials: true,
                optionsSuccessStatus: 200
            };

            app.use(cors(corsOptions));

            /*
            router.get("/", (req, res) => res.send("hello"));

            const routes = require('../components');
            for(route of routes) {
                app.use(route.path, route.router);
            }

            */
            //app.use("/api/users", require("./routes/users"));
            this.$server = app.listen(this.$config.port, () => {
                console.log(`${this.$name}:: listening on http://${this.$config.host}:${this.$config.port}`);
            });

        }
        catch(error) {
            console.error(`${this.$name}::start:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if(this.$mongoStore) {
                await this.$mongoStore.destroy();
                delete this.$mongoStore;
            }

            if(this.$server) {
                await new Promise ((resolve, reject) => {
                    try {
                        setTimeout(resolve, 5000);
                        this.$server.close(resolve);
                    }
                    catch(err) {
                        reject(err);
                    }
                });
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

    async addRoutes(route) {
        try {
            this.$app.use(route.path, route.router);
        }
        catch(error) {
            console.error(`${this.$name}::addRoutes`, error);
            throw error;
        }
    }

    _handleMongoError(error) {
        console.error(`${this.$name}::_handleMongoError`, error);
        this.emit('error', error);
    }

    _handleExpressError(error) {
        console.error(`${this.$name}::_handleExpressError`, error);
        this.emit('error', error);
    }
};

module.exports = {
    'name': 'WebserverService',
    'create': WebserverService,
    'dependencies': [{
        'type': 'service',
        'name': 'MongoService'
    }]
}