/* eslint-disable strict */

'use strict';

// Read the .env file.
import * as dotenv from 'dotenv';

// Require the framework
import Fastify from 'fastify';

dotenv.config();

// Instantiate Fastify with some config
const app = Fastify({
    logger: true,
});

// Register your application as a normal plugin.
app.register(import('./bin/server.js'));

export default async (req, res) => {
    await app.ready();
    app.server.emit('request', req, res);
};
