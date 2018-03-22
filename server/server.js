'use strict';

import Hapi from 'hapi';
import Boom from 'boom';
import Catbox from 'catbox';
import Memory from 'catbox-memory';
import uuid from 'uuid/v4';
import Joi from 'joi';

//TODO LOUT (partially implemented)

const client = new Catbox.Client(Memory);
const key = {id: 'tasks', segment: 'default'};

const ALL = 'ALL';
const COMPLETE = 'COMPLETE';
const INCOMPLETE = 'INCOMPLETE';
const DESCRIPTION = 'DESCRIPTION';
const DATE_ADDED = 'DATE_ADDED';

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
    handler: async function (request, h) {

        const filter = request.query.filter ?
            encodeURIComponent(request.query.filter) :
            'ALL';

        const order = request.query.orderBy ?
            encodeURIComponent(request.query.orderBy) :
            'DATE_ADDED';

        //RESELECT HERE
        let dbList = JSON.parse((await client.get(key)).item);


        const reply = `Requesting ${filter} TODOs and ordering them by ${order}!`;
        return h.response(reply).code(200);
    },
    options: {
        validate: {
            query: {
                filter: Joi.string().valid(ALL, COMPLETE, INCOMPLETE).optional(),
                orderBy: Joi.string().valid(DESCRIPTION, DATE_ADDED).optional()
            },
            failAction: (request, h, err) => {
                return Boom.badRequest(err);
            }
        },
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

        const description = request.payload.description;
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
        validate: {
            payload: {
                description: Joi.string().trim().required()
            },
            failAction: (request, h, err) => {
                return Boom.badRequest(err);
            }
        },
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
        const description = request.payload.description;
        const state = request.payload.state;

        let dbList = JSON.parse((await client.get(key)).item);
        //const index = dbList.findIndex((todo) => todo.id === request.params.id);
        const index = getIndex(dbList, request.params.id);

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
        validate: {
            payload: Joi.object().keys({
                state: Joi.string().valid(COMPLETE, INCOMPLETE),
                description: Joi.string()
            }).xor('state', 'description'),
            failAction: (request, h, err) => {
                return Boom.badRequest(err);
            }
        },
        description: 'Edit/Update TODOs',
        notes: 'The expected request body should contain a single JSON object with a combination of the following fields: state and description. Both fields are optional, but at least one must be present.',
        tags: ['edit', 'update', 'patch', 'todos']
    }
});

//DELETE Route
server.route({
    method: 'DELETE',
    path: '/todos/{id?}',
    handler: async function (request, h) {
        let dbList = JSON.parse((await client.get(key)).item);
        //const index = dbList.findIndex((todo) => todo.id === request.params.id);
        const index = getIndex(dbList, request.params.id);
        // check if id exists
        if (index === -1){
            return Boom.notFound();
        }
        // removes de requested item
        else{
            dbList.splice(index,1);
            await client.set(key, JSON.stringify(dbList), 50000);

            const result = await client.get(key);
            console.log(result.item);
            let reply = "Todo item has been deleted";
            return h.response(reply).code(200);
        }
    },
    options: {
        validate: {
            params: {
                id: Joi.string().trim().required()
            },
            failAction: (request, h, err) => {
                return Boom.badRequest(err);
            }
        },
        description: 'Delete TODO',
        notes: 'Deletes a TODO. The item will be referenced by id using the URL parameter id',
        tags: ['delete', 'todo']
    }
});

function getIndex(dbList, id){
    return dbList.findIndex((todo) => todo.id === id);
}

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

