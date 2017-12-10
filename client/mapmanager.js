/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const Entity = require('./entity');

const TileMapping = require('./../core/tilemapping');
const Resources = require('./resources.json');

class MapManager extends PIXI.Container{

    constructor() {
        super();
    }

    onMapReceived(map){

        var resources = Resources[map.theme || "default"].content;

        for(let y=0;y<map.height;y++){
            for(let x=0;x<map.width;x++){
                let curIndex = (y*map.height) + x;
                let curItem = map.data[curIndex];

                this.addChild(new Entity({
                    position:{
                        x:x*map.tilesize,
                        y:y*map.tilesize
                    },
                    hitArea: {
                        type:"rectangle",
                        width: map.tilesize,
                        height: map.tilesize,
                    },
                    texture:resources[TileMapping.getName(curItem)].texture
                }));
            }
        }

       /* for(let i=0;i<map.data.length;i++){
            let c = new Entity({
                position:{
                    x:0,
                    y:0
                },
                width:map.tilesize,
                height:map.tilesize
            });
            this.addChild(c);

        }*/
    }
}

module.exports = MapManager;