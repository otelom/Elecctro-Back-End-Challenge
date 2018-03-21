'use strict';

import Hapi from 'hapi';
import Boom from 'boom';
import Catbox from 'catbox';
import Memory from 'catbox-memory';


/*const Hapi=require('hapi');
const Boom=require('boom');
const Catbox=require('catbox');
const Memory=require('catbox-memory');*/

//TODO JOI
//TODO LOUT (partially implemented)
//TODO CATBOX

const client = new Catbox.Client(Memory);


// Create a server with a host and port
const server=Hapi.server({
    host:'localhost',
    port:8000
});

// IS-UP ROUTE
server.route({
    method:'GET',
    path:'/test',
    handler:function(request,h) {
        // TODO TEST DB CONNECTION
        let dbOK = false;
        if (dbOK)
            return'API is up and running!\n No issues detected.';
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
            if(description){
                // TODO ADD
                await client.set(1, description, 50000);
                const result = await client.get(description);
                console.log(result);
                const reply = `Requesting to add the following TODO: ${description}`
                return h.response(reply).code(201);
            }
            else
                return Boom.badRequest('The expected request body should contain a single JSON object with a description field.');
            
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
    handler: function (request, h) {
            let reply;
            const description = JSON.parse(request.payload).description;
            const state = JSON.parse(request.payload).state;
            console.log(request.params.id);
            //this will be the task that exists on server
            const todo  = {
                completed: 'true'
            }

            if(state || description){
                if(description){
                    // TODO EDIT DESCRIPTION
                    reply = `Requesting to update TODO #${request.params.id} with the following description: "${description}"`
                    return h.response(reply).code(200);
                }
                else if(todo.completed === state){
                    reply = `TODO\'s state is already ${state}`
                    return Boom.badRequest(reply);            
                }
                else{
                    // TODO EDIT STATE
                    reply = `Requesting to change TODO #${request.params.id}\'s state to ${state}`
                    return h.response(reply).code(200);
                }

            }
            else
                return Boom.badRequest('The expected request body should contain a single JSON object with a combination of the following fields: state and description. Both fields are optional, but at least one must be present.');            


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
            const todo  = {
                id: '123'
            }

            if(todo.id === request.params.id){
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

