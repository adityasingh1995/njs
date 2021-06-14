"use strict"
const BaseComponent = require('../base-component');
class Users extends BaseComponent {
    constructor(dependencies) {
        super("Users", dependencies);
    }

    async getRoutes() {
        try {
            const Router = require('koa-router');
            const router = new Router();
            const cookieFieldName = this.$dependencies.WebserverService.$config.cookieName;
            router.get('/user', async(ctxt, next) => {
                ctxt.body = 'Hello';
                if(ctxt.state.user)
                    ctxt.body = JSON.stringify(ctxt.state.user);
                return;
            });


            router.get('/login', async (ctxt, next) => {
                if(ctxt.state.user) {
                    ctxt.redirect('/')
                    return;
                }

                const loginTemplate = `
            <!DOCTYPE html>
            <head>
                NJS
            </head>
            <body>
                <form method="post">
                    <div class="container">
                        <label for="uname"><b>Username</b></label>
                        <input type="text" placeholder="Enter Username" name="uname" required>

                        <label for="psw"><b>Password</b></label>
                        <input type="password" placeholder="Enter Password" name="psw" required>

                        <button type="submit">Login</button>
                    </div>
                </form>
            </body>
            `;
                ctxt.body = loginTemplate; 
            });

            const uuid = require('uuid');

            router.post('/login', async (ctxt, next) => {
                if(ctxt.state.user) {
                    ctxt.redirect('/');
                    return;
                }

                let user = await this.$dependencies.DatabaseService.$knex.raw(`SELECT * FROM users WHERE user_name = ?`, [ctxt.request.body['uname']]);
                user = user.rows.length ? user.rows.shift() : null;

                if(!user) {
                    ctxt.throw(401, 'Invalid Credentials');
                    return;
                }

                const passwordMatch = (user.password === ctxt.request.body.psw)// await bcrypt.compare(ctxt.request.body.psswd, user['password']);
                if(!passwordMatch) {
                    ctxt.throw(401, 'Invalid Credentials');
                    return;
                }

                // store session data in cache;
                const sessionData = JSON.stringify({
                    'user_id': user.id
                });

                const sessionKey = uuid.v4();
                await this.$dependencies.CacheService.$redisClient.setexAsync(sessionKey, (this.$dependencies.WebserverService.$config.maxAge), sessionData);
                ctxt.cookies.set(cookieFieldName, sessionKey, {
                    'maxAge': (this.$dependencies.WebserverService.$config.maxAge),
                    'signed': true,
                    'secure': false,
                    'httpOnly': true,
                    'overwrite': true
                });

                ctxt.redirect('/');
                ctxt.body = 'Logged In Succesfully';
            });

            router.post('/logout', async (ctxt, next) => {
                if(!ctxt.state.user) {
                    ctxt.redirect('/login')
                    return;
                }

                const sessionId = ctxt.cookies.get(cookieFieldName, {
                    'secure': false
                });

                if(!sessionId) {
                    ctxt.redirect('/login')
                    return;
                }

                ctxt.cookies.set(cookieFieldName);
                await this.$dependencies.CacheService.$redisClient.delAsync(sessionId);

                ctxt.redirect('/login');
                ctxt.body = 'Logged Out';
            });

            return router;
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
    }, {
        'type': 'service',
        'name': 'CacheService'
    }, {
        'type': 'service',
        'name': 'WebserverService'
    }]
}