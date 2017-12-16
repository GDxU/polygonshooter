/**
 * Created by Mick on 03.12.2017.
 */

'use strict';
const COM = require('./../core/com');
const LerpManager = require('./lerpmanager');
const Entity = require('./entity');

const Ticks = require('./../core/ticks');

const ENTITY_DESCRIPTION = require('./entitydescription.json');

const EVT_ENTITY_MOVED = "entitymoved";

const EVT_ON_PLAYER_RECEIVED = "onPlayerReceived";

class EntityManager extends PIXI.Container{

    constructor() {
        super();
        this.entities={};

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
        if(!entityAddEvt || !entityAddEvt.entity) throw "insufficent data passed - cannot create entity";

        let entities = [].concat(entityAddEvt.entity);

        if(entities.length <=0) throw "no entity add data passed";

        for(let i=0;i< entities.length;i++) {
            let entityData = entities[i];
            //  playerData.type = "circle";
            entityData.appearance = ENTITY_DESCRIPTION[entityData.type || "none"].appearance;

            let entity = new Entity(entityData);
            this.entities[entityData.id] = entity;

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
                    //TODO: mode update
                    console.log("MODE:",cur);
                    break;
            }
        }
    }

    initDataHandler(initDataEvt){
        if(!initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME]
            || !initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME].playerEntityId)
                throw "initdata is damaged,";

        this.playerEntityId = initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME].playerEntityId;

        this.emit(EVT_ON_PLAYER_RECEIVED,{playerEntityId:this.playerEntityId});


        /*   let playerData = initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME].player;
         //  playerData.type = "circle";
           playerData.texture = PLAYER_TEXTURE;

           let player = new Entity(playerData);
           this.entities[playerData.id] = player;

           this.addChild(player);*/
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