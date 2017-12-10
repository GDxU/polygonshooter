/**
 * Created by Mick on 09.12.2017.
 */

'use strict';
const Matter = require('matter-js');
const Path = require('path');
const fs = require('fs');

const CONF = require('./minigolfconf.json');

const Util = require('./../../../core/util');
const BaseServerModule = require('./../baseservermodule');
const COM = require('./../../../core/com');

const ServerEntity = require('./serverentity');

const Engine = Matter.Engine,
    Runner = Matter.Runner,
    Composites = Matter.Composites,
    Common = Matter.Common,
    MouseConstraint = Matter.MouseConstraint,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;


const SEND_PERCISION_POSITION = 3;
const SEND_PERCISION_ROTATION = 4;


const EVT_AFTER_UPDATE = "afterUpdate";

class MinigolfModule extends BaseServerModule{

    constructor(ticks) {
        super(COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME);

        /**
         * defines the update time of the physics engine
         * 1000/tick will be the intervall in which the pyhsics engine is updated
         * @type {number}
         */
        this._ticks = ticks;

        // overwrite the original update method of Body,
        // to be able to detect and send position changes
        Body.update_original = Body.update;
        Body.update = this._bodyUpdateOverwrite.bind(this);

        /**
         * caching the updates from the clients,
         * to apply them, before the engine step
         * @type {Array}
         * @private
         */
        this._incomingUpdatesQueue = [];

        /**
         * engine of the current game
         * @type {Matterjs.Engine}
         * @private
         */
        this._engine = null;

        /**
         * contains all entities (not map)
         * @type {{}}
         */
        this.gameEntities={};

        this.listeningUpdates = [
            COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_SERVER.SWING
        ];
    }

    init(data){
        super.init(data);

        for(let i = 0; i<this.listeningUpdates.length;i++) {
            //TODO: von events json
            this.on("onStateUpdateReceived_" + this.listeningUpdates[i], (evt) => {
                this._incomingUpdatesQueue.push(evt);
            });
        }

        setInterval(this._updateEngine.bind(this), 1000 / this._ticks);

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

        Engine.update(this._engine, 1000 / this._ticks);
    }

    onConnectionReceived(socket){
        // TEST INIT, should be in module
        let path = Path.join(appRoot,CONF.MAP_DIRECTORY,"testmap"+".json");
        this._currentMap = JSON.parse(fs.readFileSync(path).toString());
        this._sendToClient(socket,
            COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.MAP,
            COM.createEvent(this.SERVER_ID,{
                width:this._currentMap.map.width,
                height:this._currentMap.map.height,
                tilesize:this._currentMap.map.tilesize,
                data:this._currentMap.map.data
            })
        );


        // if there is no map loaded, do nothing, anymore
        if(!this._currentMap){
            return {};  // TODO: send other players
        }

        // create entity for the newly connected client
        // and add the clientbody to the world
    /*    let radius = this._currentMap.map.tilesize/4;//(this._currentMap.map.tilesize/2)-(this._currentMap.map.tilesize*0.1);
        let body = Bodies.circle(50,50,radius); // TODO: load  start position from map
        body.client = socket.clientData.id;

        World.add(
            this._engine.world,
            body
        );*/
        let entityRaw = {
            position:{x:50,y:50},
            playerID:socket.clientData.id,
            hitArea: {
                type:"circle",
                radius: this._currentMap.map.tilesize / 4
            }
        };
        let entity = new ServerEntity(entityRaw);

        this.addEntity(entity);

        entity.velocity = {x:25,y:25};

        // send everyone the new client
        this._broadcastExceptSender(
            socket,
            COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.ENTITY_ADDED,
            {
                type:"player",
                entity:entityRaw,
                playerID:socket.clientData.id
            }
        );

        return {
            player:entity.toJSON()
        };
    }

    onConnectionLost(socket){
        // remove client on disconnect
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
        Matter.Events.on(this._engine,'afterUpdate', () => {
            // process all updates
            this._processUpdates(this._incomingUpdatesQueue);

            // reset updates, because they are now all processed
            this._incomingUpdatesQueue = [];

            // emit an event, so that other processes can also hook in
            this.sharedEvents.emit(EVT_AFTER_UPDATE);
        });

        // sets the listeners, which are needed for stacking and so on
        Matter.Events.on(this._engine,'collisionActive',this._collisionActive.bind(this));
        Matter.Events.on(this._engine,'collisionEnd',this._collisionEnd.bind(this));
        Matter.Events.on(this._engine,'collisionStart',this._collisionStart.bind(this));


        // add before update event, so that all received updates from the clients
        // can be executed before an engine-step
      /*  Matter.Events.on(this.engine,
            'afterUpdate', function () {
                this.emit(EVT_BEFORE_UPDATE);
            }.bind(this));*/

        // load the map
        this._currentMap = JSON.parse(fs.readFileSync(path).toString());

        // TODO: create  bodies
        // TODO: send bodies to clients


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

    _processUpdates(queue){
        for(let i=0; i< queue.length; i++){
            let id = queue[i].id;
            let type =queue[i].type;
            let data = queue[i].data;
            console.log("update",type,id,data);

        switch (type) { // claim and release entiy is updaated first, becuase the other functions need the claim
            // an user copys an entity
            case COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_SERVER.SWING:
                console.log("swing");
                break;
            }
        }
    }

    /**
     * adds an entity to the entitymanager and creates
     * @param entity
     * @param send true, if the entity should be broadcasted to the clients
     * @private
     */
    addEntity(entity,send){
        if(!entity){
            console.warn("addEntities: no entity passed!");
            return;
        }

        if(this.gameEntities[entity.ID]){
            console.log("addEntities: enitty already added!");
            return;
        }

        this.gameEntities[entity.ID] = entity;
        World.add(this._engine.world,entity.body);
        entity.isAddedToWorld = true;

        if(send){
            this._postUpdate(
                COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.ENTITY_ADDED,
                this.SERVER_ID,
                {
                    newEntities:entity.toJSON(),
                    _mode:"pushAvoidDuplicates"
                }
            );
        }
    }

    /**
     * overwrites the MATTER-JS in order to be able to detect position or angle changes
     * @param body
     * @param deltaTime
     * @param timeScale
     * @param correction
     * @private
     */
    _bodyUpdateOverwrite(body, deltaTime, timeScale, correction) {
        // before update
        // save the old values, to detect changes
        let oldData = {
            x: body.position.x,
            y: body.position.y,
            vel_x:body.velocity.x,
            vel_y:body.velocity.y,
            angle: body.angle
        };

        // call the original update method
        Body.update_original(body, deltaTime, timeScale, correction);//.bind(Body);

        //after update
        if(body.onInitOnce){
            body.onInitOnce();
            delete body.onInitOnce;
        }

        let updateRequired = false;
        let data ={};

        // send just the changed values, values are rounded,
        // because it is not necessary to send 0.0001 changes
        if (Util.round(oldData.x,SEND_PERCISION_POSITION) !== Util.round(body.position.x,SEND_PERCISION_POSITION)){
            data.position = data.position || {};
            data.position.x = body.position.x;
            updateRequired=true;
        }
        if(Util.round(oldData.y,SEND_PERCISION_POSITION) !== Util.round(body.position.y,SEND_PERCISION_POSITION) ){
            data.position = data.position || {};
            data.position.y = body.position.y;
            updateRequired=true;
        }
        if(Util.round(oldData.angle,SEND_PERCISION_ROTATION) !== Util.round(body.angle,SEND_PERCISION_ROTATION)){
            data.angle = body.angle;
            updateRequired=true;
        }

        // if the _body has not changed, nothing to do, nothing to send
        if(updateRequired) {
            this._postUpdate(
                COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_CLIENT.ENTITY_TRANSFORMATION_UPDATE,
                body.ENTITY_ID,
                data
            );
        }

        // check if the mode has changed

        let speed = Util.round(Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y),SEND_PERCISION_POSITION);
        let oldSpeed = Util.round(Math.sqrt(oldData.vel_x * oldData.vel_x + oldData.vel_y * oldData.vel_y),SEND_PERCISION_POSITION);

        if(speed !== oldSpeed){
            let modeUpdateRequired = false;
            //TODO update mode
            if(speed === 0){    // it was moving, but now it is standing still
                modeUpdateRequired = body.entity.setMode("DEFAULT");
            }

            if(oldSpeed){       // if it was not moving, but now it is moving
                modeUpdateRequired = body.entity.setMode("MOVING");
            }

            //if mode has changed, send update
            if(modeUpdateRequired) {
                this._postUpdate(
                    COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_CLIENT.ENTITY_MODE_UPDATE,
                    body.ENTITY_ID,
                    {newMode:body.entity.currentMode}
                );
            }
        }
    }

    /**
     *
     Event Payload:

     event Object

     An event object
     pairs

     List of affected pairs
     timestamp Number

     The engine.timing.timestamp of the event
     source

     The source object of the event
     name

     The name of the event


     * @param evt
     * @private
     */
    _collisionStart(evt){

    }

    /**
     *
     Event Payload:

     event Object

     An event object
     pairs

     List of affected pairs
     timestamp Number

     The engine.timing.timestamp of the event
     source

     The source object of the event
     name

     The name of the event


     * @param evt
     * @private
     */
    _collisionEnd(evt){

    }

    /**
     *
     Event Payload:

     event Object

     An event object
     pairs

     List of affected pairs
     timestamp Number

     The engine.timing.timestamp of the event
     source

     The source object of the event
     name

     The name of the event


     * @param evt
     * @private
     */
    _collisionActive(evt){

    }
}

module.exports = MinigolfModule;