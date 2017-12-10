/**
 * Created by Mick on 03.12.2017.
 */

'use strict';
const COM = require('./../core/com');

const Entity = require('./entity');

const PLAYER_TEXTURE = "ball.png";

class EntityManager extends PIXI.Container{

    constructor() {
        super();
        this.players={};
    }


    entityAdded(){

    }

    initData(initDataEvt){
        console.log("init",initDataEvt);
        let playerData = initDataEvt[COM.PROTOCOL.MODULES.MINIGOLF.MODULE_NAME].player;
        playerData.type = "circle";
        playerData.texture = PLAYER_TEXTURE;

        let player = new Entity(playerData);

        this.addChild(player);
    }
}

module.exports = EntityManager;