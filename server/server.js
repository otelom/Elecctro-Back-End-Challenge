'use strict';

import Hapi from 'hapi';
import Boom from 'boom';
import Catbox from 'catbox';
import Memory from 'catbox-memory';
import uuid from 'uuid/v4';

//TODO JOI
//TODO LOUT (partially implemented)

const client = new Catbox.Client(Memory);
const key = {id: 'tasks', segment: 'default'};

// Create a server with a host and port
const server = Hapi.server({
    host: 'localhost',
    port: 8000
});

// IS-UP ROUTE
server.route({
    method: 'GET',
    path: '/test',
    handler: function (request, h) {
        // TODO TEST DB CONNECTION
        let dbOK = false;
        if (dbOK)
            return 'API is up and running!\n No issues detected.';
        else
            return Boom.serverUnavailable('API is up but there is a problem with the database. Please try again later.');
    },
    options: {
        description: 'Create/Add TODO',
        notes: 'The expected request body should contain a single JSON object with a description field.',
        tags: ['add', 'create', 'todo']
    }
});

//GET Route
server.route({
    method: 'GET',
    path: '/todos',
    handler: function (request, h) {

        const filter = request.query.filter ?
            encodeURIComponent(request.query.filter) :
            'ALL';

        const order = request.query.orderBy ?
            encodeURIComponent(request.query.orderBy) :
            'DATE_ADDED';

        // TODO GET

        return `Requesting ${filter} TODOs and ordering them by ${order}!`;
    },
    options: {
        description: 'Return TODOs',
        notes: 'The filter and order parameters defaults to \'ALL\' and \'DATE_ADDED\' respectively if unspecified',
        tags: ['get', 'todos']
    }
});

//ADD Route
server.route({
    method: 'PUT',
    path: '/todos',
    handler: async function (request, h) {

        const description = JSON.parse(request.payload).description;
        if (description) {
            // TODO ADD
            const todo = {
                id: uuid(),
                description: description,
                completed: false,
                dateAdded: new Date().toISOString()
            };
            let dbList = (await client.get(key)).item;
            console.log(dbList);
            dbList = JSON.parse(dbList);
            dbList.push(todo);
            await client.set(key, JSON.stringify(dbList), 50000);
            const result = await client.get(key);
            console.log(result.item);
            const reply = `Requesting to add the following TODO: ${description}`
            return h.response(reply).code(201);
        }
        else
            return Boom.badRequest('The expected request body should contain a single JSON object with a' +
                ' description field.');

    },
    options: {
        description: 'Create/Add TODO',
        notes: 'The expected request body should contain a single JSON object with a description field.',
        tags: ['add', 'create', 'todo']
    }
});

//EDIT Route
server.route({
    method: 'PATCH',
    path: '/todos/{id}',
    handler: async function (request, h) {
        let reply;
        const description = JSON.parse(request.payload).description;
        const state = JSON.parse(request.payload).state;
        let dbList = JSON.parse((await client.get(key)).item);
        const index = dbList.findIndex((todo) => todo.id === request.params.id);

        // check if id exists
        if (index === -1){
            console.log(("index morreu"));
            return Boom.notFound();}
        // check if the change is to the description
        if (description) {
            console.log("index: ", index);
            console.log("item: ", dbList[index]);
            console.log("item.completed: ", dbList[index].completed);
            // check if task is not marked as completed
            if (dbList[index].completed) {
                reply = `TODO already marked as complete`;
                return Boom.badRequest(reply);
            }
            // update the todo with the new description
            dbList[index].description = description;
            reply = `Requesting to update TODO #${request.params.id} with the following description: "${description}"`;
        }
        // check if the change is to the state
        else if (state) {
            // update todo state
            reply = `Requesting to change TODO #${request.params.id}\'s state to ${state}`;
            dbList[index].completed = state;
        }
        // request body is not correct
        else
            return Boom.badRequest('The expected request body should contain a single JSON object with a combination' +
                ' of the following fields: state and description. Both fields are optional, but at least one must' +
                ' be present.');

        await client.set(key, JSON.stringify(dbList), 50000);

        const result = await client.get(key);
        console.log(result.item);

        return h.response(reply).code(200);
    },
    options: {
        description: 'Edit/Update TODOs',
        notes: 'The expected request body should contain a single JSON object with a combination of the following fields: state and description. Both fields are optional, but at least one must be present.',
        tags: ['edit', 'update', 'patch', 'todos']
    }
});

//DELETE Route
server.route({
    method: 'DELETE',
    path: '/todos/{id}',
    handler: function (request, h) {


        //this will be the task that exists on server
        // todos.get(request.params.id)
        const todo = {
            id: '123'
        };

        if (todo.id === request.params.id) {
            // TODO DELETE
            return h.response().code(200);
        }
        else
            return Boom.notFound();

    },
    options: {
        description: 'Delete TODO',
        notes: 'Deletes a TODO. The item will be referenced by id using the URL parameter id',
        tags: ['delete', 'todo']
    }
});

// Start the server
async function start() {

    try {
        await client.start();
        let todos = [];
        await client.set(key, JSON.stringify(todos), 50000);
        await server.register([require('vision'), require('inert'), require('lout')]);
        server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at:', server.info.uri);
};

start();

