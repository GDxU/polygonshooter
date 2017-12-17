/**
 * Created by Mick on 03.12.2017.
 */

'use strict';
const COM = require('./../core/com');
const LerpManager = require('./lerpmanager');
const Entity = require('./entity');

const Ticks = require('./../core/ticks.json');

const COLORS = require('./../core/resources/colors.json');

const ENTITYDESC = require('../core/entitydescription.json');
const ENTITYMODES = require('../core/entiymodes.json');

const EVT_ENTITY_MOVED = "entitymoved";

const EVT_ON_PLAYER_RECEIVED = "onPlayerReceived";

const EVT_PLAYER_OVER = "onPlayerMouseOver";
const EVT_PLAYER_OUT = "onPlayerMouseOut";
const EVT_PLAYER_DOWN = "onPlayerMouseDown";
const EVT_PLAYER_UP = "onPlayerMouseUp";
const EVT_PLAYER_UP_OUTSIDE = "onPlayerMouseUpOutside";

class EntityManager extends PIXI.Container{

    constructor() {
        super();
        this.entities={};

        this.players = {};

        this.lerpManager = new LerpManager();

        // push the lerpmanager, so it gets updated
       // window.UPDATE.push(this.lerpManager.update.bind(this.lerpManager));

        /**
         * contains the id of the player's  (ball)
         * @type {String}
         */
        this.playerEntityId = null;
    }

    update(delta){
        this.lerpManager.update(delta);
    }

    entityAddedHandler(entityAddEvt){
        if(!entityAddEvt || !entityAddEvt.entities) throw "insufficent data passed - cannot create entity";

        let entities = [].concat(entityAddEvt.entities);

        if(entities.length <=0) throw "no entity add data passed";

        for(let i=0;i< entities.length;i++) {
            let entityData = entities[i];

            // if the entity already exists, e.g. the client reconnects, do not create it again
            if(this.entities[entityData.id]){
                continue;
            }

            entityData.appearance = ENTITYDESC[entityData.type || ENTITYDESC.NONE.name].appearance;

            // if the mode is quitted - set the quit color
            if(entityData.mode === ENTITYMODES.QUIT){
                entityData.appearance.color = COLORS.SPECIAL_COLORS.QUITTED;
            }

            let entity = new Entity(entityData);
            this.entities[entityData.id] = entity;

            // if entity is a player, save it in the player list
            if(entityData.type === ENTITYDESC.PLAYER.name){
                entity.clientId = entityData.clientId;
                this.players[entityData.clientId] = entity;
            }

            this.addChild(entity);
        }
    }

    updateState(data){
        for(let type in data.updates) {
            if (!data.updates.hasOwnProperty(type)) continue;

            let cur = data.updates[type];

            switch (type){
                case COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_CLIENT.ENTITY_TRANSFORMATION_UPDATE:
                    this._applyTransformationUpdate(cur,data.timeSinceLastUpdate);
                    break;
                case COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_CLIENT.ENTITY_MODE_UPDATE:
                    this.updatePlayerMode(cur);
                    break;
            }
        }
    }

    updatePlayerMode(evt){
        for(let entityId in evt) {
            if (!evt.hasOwnProperty(entityId)) continue;

            let cur = evt[entityId].mode;
            switch(cur) {
                case ENTITYMODES.QUIT:
                    this.entities[entityId].mode = cur;
                    this.entities[entityId].setColorString(COLORS.SPECIAL_COLORS.QUITTED);
                    break;
                default:
                    break;
            }
        }
    }

    updatePlayerColor(evt){
        if(!evt || !evt.colorUpdates){
            console.error("no color updates passed");
            return;
        }

        let e = [].concat(evt.colorUpdates);

        for(let i=0; i< e.length;i++){
            let player = this.players[e[i].id];
            if(!player) continue;
            if(typeof e[i].color !== "number" || e[i].color <0 || e[i].color >= COLORS.PLAYERS_COLORS.length) continue;

            player.setColorString(COLORS.PLAYERS_COLORS[e[i].color]);
        }
    }

    clientConnected(evt){
        console.log(evt);
    }

    /**
     * inits the player data, aswell as the data of other clients
     * @param initDataEvt
     */
    initDataHandler(initDataEvt){
        if(!initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME]
            //|| !initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME].playerEntityId
        ) {
            throw "initdata is damaged,";
        }

        let mg = initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME];
        let general = initDataEvt[COM.PROTOCOL.GENERAL.MODULE_NAME];

        // add the entities to the manager
        this.entityAddedHandler(mg);

        // colorize all received players
        this.updatePlayerColor({colorUpdates:general.connectedClients});

        // make the player entity interactable
        if(mg.playerEntityId) {
            this.playerEntityId = mg.playerEntityId;
            this.entities[this.playerEntityId].interactive = true;

            this.entities[this.playerEntityId]
                .on('mouseover', (e)=>this.emit(EVT_PLAYER_OVER,e), true)
                .on('mouseout', (e)=>this.emit(EVT_PLAYER_OUT,e), true)
                .on('mousedown', (e)=>this.emit(EVT_PLAYER_DOWN,e),true)
                .on('mouseup', (e)=>this.emit(EVT_PLAYER_UP,e),true)
                .on('mouseupoutside', (e)=>this.emit(EVT_PLAYER_UP_OUTSIDE,e) ,true);

        }
   //     this.emit(EVT_ON_PLAYER_RECEIVED,{playerEntityId:this.playerEntityId});
    }

    _applyTransformationUpdate(updates,timeSinceLastUpdate){
       // let updates = [].concat(updates);
        for(let id in updates){
            if (!updates.hasOwnProperty(id)) continue;
            let change = updates[id];

            this._updateEntityTransformation(id,change,timeSinceLastUpdate)
        }
    }

    /**
     * used to update an entities position and rotation(angle)
     * @param entityID id of the entity, of which the transformation should be changed
     * @param transformation the changed data of the entity related to the id
     * @param timeSinceLastUpdate is the time since the last update and used as LERP intervall
     * @param force true, to force the position set
     */
    _updateEntityTransformation(entityID,transformation,timeSinceLastUpdate=0,force){
        if(!entityID){
            console.warn("entity id is necessary to update enitty");
            return;
        }

        if(!this.entities[entityID]){
            console.warn("entity",entityID,"does not exist!");
            return;
        }

        if(!transformation){
            console.warn("no transformation data for entity",entityID,"was passed");
            return;
        }

        let cur = this.entities[entityID];

        if(!force) {
            // sometimes, just the angle is sent, position stays same
            if(transformation.position) {
                // be sure, that all necessary values are available
                transformation.position.x = transformation.position.x || cur.position.x;
                transformation.position.y = transformation.position.y || cur.position.y;

                // if position has changed, lerp position
                if (transformation.position.x !== cur.position.x
                    || transformation.position.y !== cur.position.y) {
                    let self = this;
                    this.lerpManager.push(entityID,"position",{
                        get value() {
                            return cur.position
                        },
                        set value(v){
                            cur.position.x = v.x || 0;
                            cur.position.y = v.y || 0;
                        },
                        beforeUpdate:function(){
                            this._oldX = cur.position.x;
                            this._oldY = cur.position.y;
                        },
                        afterUpdate:function(){
                            if(cur.position.x !== this._oldX || cur.position.y !== this._oldY) {
                                self.emit(EVT_ENTITY_MOVED,{entity:cur,oldPosition:{x:this._oldX ,y:this._oldY}});
                            }
                        },
                        start: {x: cur.position.x, y: cur.position.y},
                        end: {x: transformation.position.x, y: transformation.position.y},
                        type: "position",
                        interval: Math.min(timeSinceLastUpdate,Ticks.MAX_DELAY), //Ticks.SERVER_UPDATE_INTERVAL,
                        minDiff:1
                    });
                }
            }

            // if angle(rotation) value exists, and it does not equal the current
            // entities value, then lerp it
            if ((transformation.angle || transformation.angle === 0)
                && cur.rotation !== transformation.angle) {
                this.lerpManager.push(entityID, "rotation", {
                    get value() {
                        return cur.rotation
                    },
                    set value(v) {
                        cur.rotation = v;
                    },
                    start: cur.rotation,
                    end: transformation.angle,
                    type: "value",
                    interval: Math.min(timeSinceLastUpdate, Ticks.MAX_DELAY), //Ticks.SERVER_UPDATE_INTERVAL,
                    minDiff: 0.01
                });
            }

        }else{  // when position change is forced:
            // just change the available values, e.g. sometimes,
            // just angle is sent, when just the angle is changes
            if(transformation.position) {
                let oldX = cur.position.x;
                let oldY = cur.position.y;

                cur.position.x = transformation.position.x;
                cur.position.y = transformation.position.y;
                if(cur.position.x !== oldX || cur.position.y !== oldY) {
                    this.emit(EVT_ENTITY_MOVED,{entity:cur,oldPosition:{x:oldX,y:oldY}});
                }
            }

            // change rotation, if available
            cur.rotation = transformation.angle || cur.rotation;
        }

    }
}

module.exports = EntityManager;