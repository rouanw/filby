import path from 'node:path';

import config from './config.json';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import changeLogRoute from './routes/changelog-v1';
import ReferenceDataFramework, { RdfProjection, RdfEvent } from '../..';

const fastify = Fastify(config.fastify);

const rdf = new ReferenceDataFramework({ ...config.rdf, ...{ database: config.database }});

type AppProcess = NodeJS.Process & {
  emit(event: string): boolean;
};

const app: AppProcess = process;

(async () => {

	await fastify.register(swagger, {
	  swagger: {
	    info: {
	      title: 'Holiday Park Data Service',
	      description: 'A proof of concept reference data application',
	      version: '1.0.0'
	    },
	    schemes: ['http'],
	    consumes: ['application/json'],
	    produces: ['application/json'],
	  }
	});

	await fastify.register(swaggerUI, {
	  routePrefix: '/documentation',
	  uiConfig: {
	    docExpansion: 'full',
	    deepLinking: false
	  },
	  uiHooks: {
	    onRequest: function (request, reply, next) { next() },
	    preHandler: function (request, reply, next) { next() }
	  },
	  staticCSP: true,
	  transformStaticCSP: (header) => header,
	  transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
	  transformSpecificationClone: true
	});

	try {
		await rdf.init();

		await registerChangelog();
		await registerProjections();

	  await fastify.listen(config.server);

		rdf.on('park_v1_change', (event: RdfEvent) => {
			console.log({ event })
		});
		rdf.on('change', (event: RdfEvent) => {
			console.log({ event })
		});
	  await rdf.startNotifications();

		registerShutdownHooks();
	  console.log(`Server is listening on port ${config.server?.port}`);
	  console.log(`See http://localhost:${config.server?.port}/documentation`);
	  console.log(`Use CTRL+D or kill -TERM ${process.pid} to stop`);
	} catch (err) {
		console.error(err);
	  process.exit(1)
	}
})();

async function registerChangelog() {
	fastify.register(changeLogRoute, { prefix: '/api/changelog', rdf });
}

async function registerProjections() {
	const projections = await rdf.getProjections();
	projections.forEach((projection: RdfProjection) => {
		const route = require(path.resolve(`routes/${projection.name}-v${projection.version}`));
		const prefix = `/api/projection/v${projection.version}/${projection.name}`;
		fastify.register(route, { prefix, rdf });
	})
}

function registerShutdownHooks() {
  app.once('SIGINT', () => app.emit('app_stop'));
  app.once('SIGTERM', () => app.emit('app_stop'));
  app.once('app_stop', async () => {
  	app.removeAllListeners('app_stop');
  	await rdf.stopNotifications();
		await fastify.close();
		await rdf.stop();
		console.log('Server has stopped');
  })
}
