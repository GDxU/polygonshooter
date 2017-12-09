/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const Matter = require('matter-js');
const uuid = require('uuid/v1');

const Paths = require('path');
const fs = require('fs');

const com = require('./../core/com');

//const TILESIZE = 64;

var Engine = Matter.Engine,
    Runner = Matter.Runner,
    Composites = Matter.Composites,
    Common = Matter.Common,
    MouseConstraint = Matter.MouseConstraint,
    World = Matter.World,
    Bodies = Matter.Bodies;

class ServerGameManager {

    constructor(ticks) {

        this._ticks = ticks || 64;

        this.ID = uuid();

        this._engine = null;
        this._world = null;
        this._resetGame();

        this._currentMap = {};

    }

    _broadcast(type,msg){
        //  this.io.sockets.emit(type,msg);
        this.io.to(this.ID).emit(type,msg);
    }

    _broadcastExceptSender(senderSocket,type,msg){
        senderSocket.broadcast.to(this.ID).emit(type,msg);
    }

    _sendToClient(clientConnectionSocket,type,msg){
        clientConnectionSocket.emit(type,msg);
    }

    start(io){
        this._io = io;
        io.on('connection', this.onConnection.bind(this));

        this._loadMap("testmap");

        setInterval(function() {
            Engine.update(this._engine, 1000 / this._ticks);
        }.bind(this), 1000 / this._ticks);
    }

    onConnection(client){
        client.on('event', (data)=>{});
        client.on('disconnect', ()=>{});

        Bodies.circle(100, 100, (this._currentMap.map.tilesize/2)- (this._currentMap.map.tilesize*0.05));

        this._sendToClient(client,
            com.PROTOCOL.GAME.TO_CLIENT.MAP,
            com.createEvent(this.ID,{
                width:this._currentMap.map.width,
                height:this._currentMap.map.height,
                tilesize:this._currentMap.map.tilesize,
                data:this._currentMap.map.data
            })
        );
    }

    _loadMap(mapName){
        //TODO: tatsächlich ne map laden

        var path = Paths.join(appRoot,MAP_DIRECTORY,mapName+".json");

        this._currentMap = JSON.parse(fs.readFileSync(path).toString());

       /* this._currentMap = {
            width:1,
            height:1,
            tilesize:TILESIZE,
            theme:"default",
            data:[0],
            bodies:[Bodies.rectangle(0, 0, TILESIZE, TILESIZE, { isStatic: true })]
        };*/
    }

    _resetGame(){
        this._engine = Engine.create();
        this._world = this._engine.world;
        // no gravity, because topdown
        this._engine.world.gravity.y = this._engine.world.gravity.x= 0;

        // add before update event, so that all received updates from the clients
        // can be executed before an engine-step
        /*Matter.Events.on(this.engine,
            'afterUpdate', function () {
                this.emit(EVT_BEFORE_UPDATE);
            }.bind(this));
*/
        // sets the listeners, which are needed for stacking and so on
      /*  Matter.Events.on(this.engine,'collisionActive',this._collisionActive.bind(this));
        Matter.Events.on(this.engine,'collisionEnd',this._collisionEnd.bind(this));
        Matter.Events.on(this.engine,'collisionStart',this._collisionActive.bind(this));*/
    }


    _connectClient(){
        World.add(this._world, stack);

        World.add(this._world, [
            // walls
            Bodies.rectangle(0, 0, TILESIZE, TILESIZE, { isStatic: true }),
            Bodies.rectangle(400, 600, 800, 50, { isStatic: true }),
            Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
            Bodies.rectangle(0, 300, 50, 600, { isStatic: true })
        ]);
    }
}

module.exports = ServerGameManager;