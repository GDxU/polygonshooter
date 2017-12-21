/**
 * Created by Mick on 21.12.2017.
 */

'use strict';

const EventEmitter3 =require('eventemitter3');

class BasePhysicsModule extends EventEmitter3{

    constructor(world) {
        super();
        this._world = world;
    }

    update(deltaTime){
        throw "abstract";
    }

}

module.exports = BasePhysicsModule;