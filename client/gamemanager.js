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

        this.synchronizer = new Synchronizer();
        this.mapManager = new MapManager();
        this.entityManager = new EntityManager();
    }

    start(){
        this.synchronizer.start();

        this.synchronizer.on(COM.PROTOCOL.GAME.MINIGOLF.MAP,(map) => this.mapManager.onMapReceived(map));


      //  this.mapManager.addChild(this.entityManager);
        this.app.stage.addChild(this.mapManager);
     //   this.app.stage.addChild(this.entityManager);
    }

    update(delta){

    }

}

module.exports = GameManager;