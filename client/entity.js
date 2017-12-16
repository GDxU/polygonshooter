/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const DEFAULT_RESOURCES = require("./resources.json").default.content;

class Entity extends PIXI.Sprite {

    constructor(entity) {
        // take texture from passed object, or take default "missing" texture
        if(!entity.appearance || !PIXI.loader.resources[(DEFAULT_RESOURCES[entity.appearance.texture] ||{} ).texture]){
            super(PIXI.loader.resources[DEFAULT_RESOURCES.missing_texture.texture].texture);
        }else {
            super(PIXI.loader.resources[(DEFAULT_RESOURCES[entity.appearance.texture] ||{} ).texture].texture);
        }

        /**
         * the raw data which was used to initialize the entity
         */
        this.rawData = entity;

        this.type = entity.type;

        /**
         * this is the prefix for every resource
         */
        this.game_resource_path = entity.game_resource_path;

        // -------- init pixi values --------
        this.position.x = entity.position.x || 0;
        this.position.y = entity.position.y || 0;
        this.rotation = entity.rotation || 0;

        switch(entity.hitArea.type) {
            case "circle":
                this.width = entity.hitArea.radius*2 || 1;
                this.height = entity.hitArea.radius*2 || 1;
                break;
            case "rectangle":
                this.width = entity.hitArea.width || 1;
                this.height = entity.hitArea.height || 1;
                break;
            default:
                this.width = entity.width || 1;
                this.height = entity.height || 1;
                break;
        }
        this.anchor.set(0.5);

        // ------- init entity values --------
        this.ENTITY_ID = entity.id;

    }

}

module.exports = Entity;