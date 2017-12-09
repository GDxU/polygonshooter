/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const EventEmitter3 = require('eventemitter3');

const Synchronizer = require('./synchronizer');
const MapManager = require('./mapmanager');
const EntityManager = require('./entitymanager');

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
    }

    start(){
        this.synchronizer.on("on"+COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.MAP,(map) => this.mapManager.onMapReceived(map));
        this.synchronizer.on("onInitGame",console.log);
        this.synchronizer.on("on"+COM.PROTOCOL.MODULES.MINIGOLF.TO_CLIENT.ENTITY_ADDED,(entity)=>this.entityManager.entityAdded(Entity)); //TODO: add entitymanager
        this.synchronizer.start();


      //  this.mapManager.addChild(this.entityManager);
        this.app.stage.addChild(this.mapManager);
     //   this.app.stage.addChild(this.entityManager);
    }

    update(delta){

    }

}

module.exports = GameManager;