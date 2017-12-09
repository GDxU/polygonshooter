/**
 * Created by Mick on 09.12.2017.
 */

'use strict';
const Matter = require('matter-js');
const Path = require('path');
const fs = require('fs');

const Ticks = require('./../../../core/ticks.json');

const BaseServerModule = require('./../baseservermodule');
const COM = require('./../../../core/com');

const CONF = require('./minigolfcong');

const Engine = Matter.Engine,
    Runner = Matter.Runner,
    Composites = Matter.Composites,
    Common = Matter.Common,
    MouseConstraint = Matter.MouseConstraint,
    World = Matter.World,
    Bodies = Matter.Bodies;


class MinigolfModule extends BaseServerModule{

    constructor() {
        super(COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME);

        this._incomingUpdatesQueue = [];

        /**
         * engine of the current game
         * @type {Matterjs.Engine}
         * @private
         */
        this._engine = null;
    }

    init(data){
        super.init(data);

        this.on("onStateUpdateReceived",(evt)=>{
            this._incomingUpdatesQueue.push(evt);
        });

        setInterval(this._updateEngine.bind(this), 1000 / Ticks.SERVER_UPDATE_INTERVAL);

        this._resetGame("","testmap");   //TODO: just test - remove
    }

    /**
     * places all updates and performs an update step of the engine
     * @private
     */
    _updateEngine(){
        if(!this._engine){
            this._incomingUpdatesQueue = [];
            return;
        }

        for(let i=0; i< this._incomingUpdatesQueue.length; i++){
            // TODO: process update
            let cur = this._incomingUpdatesQueue[i];
        }
        this._incomingUpdatesQueue = [];

        Engine.update(this._engine, 1000 / Ticks.SERVER_UPDATE_INTERVAL);
    }

    onConnectionReceived(socket){
        // TEST INIT, should be in module
        let path = Path.join(appRoot,CONF.MAP_DIRECTORY,"testmap"+".json");
        this._currentMap = JSON.parse(fs.readFileSync(path).toString());
        this._sendToClient(socket,
            COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.MAP,
            COM.createEvent(this.ID,{
                width:this._currentMap.map.width,
                height:this._currentMap.map.height,
                tilesize:this._currentMap.map.tilesize,
                data:this._currentMap.map.data
            })
        );

        // create entity for the newly connected client
        // and add the clientbody to the world

        let body = Bodies.circle(0,0,this._currentMap.tilePosition-(this._currentMap.tilesize*0.1));
        body.client = socket.clientInfo.id;

        World.add(
            this._engine.world,
            body
        );

        this._broadcast(COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.ENTITY_ADDED,{
            type:"player",
            position:{x:body.x,y:body.y,r:body.radius},
            playerID:socket.clientInfo.id
        });

        return {test:"fdssdfasd"};
    }

    /**
     * loads a map based on its name,
     * also shares the map with every client
     * @param mapName name of the map
     * @returns {boolean} true, if map was loaded, false if it wasnt
     * @private
     */
    _resetGame(userName,mapName){
        // create path to the map
        let path = Path.join(appRoot,CONF.MAP_DIRECTORY,userName,mapName+".json");

        // if map does not exists - send error to client
        if(!fs.existsSync(path)){
            this._broadcastErrorToClient(COM.PROTOCOL.MODULES.MINIGOLF.ERRORS.MAP_DOES_NOT_EXIST);
            this._currentMap = null; //TODO load text map?
            return false; // nothing loaded
        }

        this._engine = Engine.create();
        // no gravity, because topdown
        this._engine.world.gravity.y = this._engine.world.gravity.x= 0;

        // add before update event, so that all received updates from the clients
        // can be executed before an engine-step
      /*  Matter.Events.on(this.engine,
            'afterUpdate', function () {
                this.emit(EVT_BEFORE_UPDATE);
            }.bind(this));*/

        // load the map
        this._currentMap = JSON.parse(fs.readFileSync(path).toString());

        // TODO: create  bodies


        // send the new map to every client
        this._broadcast(
            COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.MAP,
            COM.createEvent(this.ID,{
                width:this._currentMap.map.width,
                height:this._currentMap.map.height,
                tilesize:this._currentMap.map.tilesize,
                data:this._currentMap.map.data
            })
        );

        return true; // everything ok, map was loaded and sent to everyone
    }

    onConnectionLost(socket){

    }

}

module.exports = MinigolfModule;