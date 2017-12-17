/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const EventEmitter3 = require('eventemitter3');

const Synchronizer = require('./synchronizer');
const MapManager = require('./mapmanager');
const EntityManager = require('./entitymanager');
const InputManager = require('./inputmanager');
const PlayerActionManager = require('./playeractionmanager');

const CONFIG = require('./config.json');
const COM = require("./../core/com");

class GameManager extends EventEmitter3{

    constructor(app) {
        super();
        this.app = app;

        this.on('resize',(d)=>{});

        this.synchronizer = new Synchronizer(COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT);
        //this.synchronizer.addSupportedMessages();

        this.mapManager = new MapManager();
        this.entityManager = new EntityManager();
        this.playerActionManager = new PlayerActionManager();
        this.inputManager = new InputManager(this.app);
        this.inputManager.loadMapping(CONFIG.KEY_MAPPING);

    }

    start(){



        //TODO von evts json
        this.synchronizer.on("on"+COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.MAP,(map) => this.mapManager.onMapReceived(map));
        this.synchronizer.on("onInitGame",(initDataEvt)=>this.mapManager.initDataHandler(initDataEvt));
        this.synchronizer.on("onInitGame",(initDataEvt)=>this.entityManager.initDataHandler(initDataEvt));
        this.synchronizer.on("onServerUpdate",(updates)=>this.entityManager.updateState(updates));
        //this.synchronizer.on("on"+COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.ENTITY_ADDED,(entityEvt)=>this.entityManager.entityAddedHandler(entityEvt)); //TODO: add entitymanager

        this.synchronizer.on("onClientConnected",(initDataEvt)=>this.entityManager.initDataHandler(initDataEvt));

        this.entityManager.on("onPlayerMouseOver",(e)=> this.playerActionManager.onPlayerMouseOver(e));
        this.entityManager.on("onPlayerMouseOut",(e)=> this.playerActionManager.onPlayerMouseOut(e));
        this.entityManager.on("onPlayerMouseDown",(e)=> this.playerActionManager.onPlayerMouseDown(e));
        this.entityManager.on("onPlayerMouseUp",(e)=> this.playerActionManager.onPlayerMouseUp(e));
        this.entityManager.on("onPlayerMouseUpOutside",(e)=> this.playerActionManager.onPlayerMouseUpOutside(e));
        this.inputManager.on("mousemove",(e)=>this.playerActionManager.onMouseMove(e));

        this.playerActionManager.on("onSwing",(e)=>{
            this.synchronizer.sendStateUpdate(COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_SERVER.SWING,{
                velocity:e.vector
            })
        });


        // TODO: remove test
   /*     this.entityManager.on("onPlayerReceived",()=>{
            console.log("ready");
            this.synchronizer.sendStateUpdate(COM.PROTOCOL.MODULES.MINIGOLF.STATE_UPDATE.TO_SERVER.SWING,{
                velocity:{
                    x:25,
                    y:25
                }
            })
        });*/


        this.synchronizer.start();

      //  this.mapManager.addChild(this.entityManager);
        this.app.stage.addChild(this.mapManager);
        this.app.stage.addChild(this.entityManager);
        this.app.stage.addChild(this.playerActionManager);
    }

    update(delta){
        const elapsed = this.app.ticker.elapsedMS;
        const d = elapsed/1000;

        this.entityManager.update(d);
        for(let i=0;i<window.UPDATE.length;i++){
            window.UPDATE[i](d);
        }
    }

}

module.exports = GameManager;