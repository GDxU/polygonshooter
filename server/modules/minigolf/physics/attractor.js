/**
 * Created by Mick on 20.12.2017.
 */

'use strict';

const BasePhysicsModule = require('./basephysicsmodule');
const Util = require('./../../../../core/util');
const Planck = require('planck-js');

class Attractor extends BasePhysicsModule{

    constructor(world) {
        super(world);

        this._runningAttractors = new Set();
        world.on("begin-contact", this._beginContact.bind(this));
        world.on("end-contact", this._endContact.bind(this));
    }

    _beginContact(contact){
        let a = contact.getFixtureA();
        let a_body = a.getBody();
        let b = contact.getFixtureB().getBody();

        if(!a_body.entity || !a_body.entity.attractor || b.isStatic())return;


        b.attractedBy = a_body.entity;
        this._runningAttractors.add(b);
    }

    _endContact(contact){
        let b = contact.getFixtureB();
        let b_body = b.getBody();
        delete b_body.attractedBy;

        this._runningAttractors.delete(b_body);
    }



    update(deltaTime){
        let values = this._runningAttractors.values();
          for (let item of values) {

              if(item.isRemoved){
                  this._runningAttractors.delete(item);
                  continue;
              }

              let from = item.getPosition();
              let to = item.attractedBy.body.getPosition();

              let strength = item.attractedBy.attractor;

              let m = Util.normalizeVector(to.x-from.x,to.y-from.y);
              m.x = m.x*strength*deltaTime;
              m.y = m.y*strength*deltaTime;

              item.applyForceToCenter(new Planck.Vec2(m.x,m.y),true);

          }
    }
}

module.exports = Attractor;