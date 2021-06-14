# NJS-LISTENER

## Install and Configure Dependencies:
1. RabbitMQ

configuration: config/<NODE_ENV>/services/rabbitmq-service.js

Following Queues Are Required
    INCOMING

2. Postgres

configuration: config/<NODE_ENV>/services/database-service.js

3. MongoDb

configuration: config/<NODE_ENV>/services/database-service.js

4. Redis

configuration: config/<NODE_ENV>/services/database-service.js

## Install package

```
cd njs-listener
npm install
```

## Run migrations

edit knexfile.js to configure the database connection parameters

```
cd knex_migrations
knex migrate:latest
knex seed:run
```

## start application

```
npm start
```



