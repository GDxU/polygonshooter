/**
 * Created by Mick on 21.12.2017.
 */

'use strict';
const BasePhysicsModule = require('./basephysicsmodule');

const EVT_GOAL = "onGoal";

const ENTITYDESC = require('./../../../../core/entitydescription.json');
const Util = require('./../../../../core/util');

const CONF = require('./../minigolfconf');

class GoalChecker extends BasePhysicsModule{

    constructor(world) {
        super(world);

        this._running = new Set();
        world.on("begin-contact", this._beginContact.bind(this));
        world.on("end-contact", this._endContact.bind(this));
    }

    _beginContact(contact){
        let a_body = contact.getFixtureA().getBody();
        let b_body = contact.getFixtureB().getBody();

        if(!a_body.entity || a_body.entity.type !== ENTITYDESC.GOAL.name
            || !b_body.entity || b_body.entity.type !== ENTITYDESC.PLAYER.name)
            return;

        this._running.add(b_body);
    }

    _endContact(contact){
        let b = contact.getFixtureB();
        let b_body = b.getBody();
        delete b_body.attractedBy;

        this._running.delete(b_body);
    }

    update(deltaTime){
        let values = this._running.values();
        for (let item of values) {

            if(item.isRemoved){
                this._running.delete(item);
                continue;
            }

            let from = item.getPosition();
            let to = item.attractedBy.body.getPosition();
            //(x1, y1, x2, y2) {
            let dist = Util.meterToPixel(Util.getVectorDistance(from.x,from.y,to.x,to.y));
            let vel = item.getLinearVelocity();
            let speed = Util.meterToPixel(Util.vectorLength(vel.x,vel.y));

            if(speed <= CONF.MIN_GOAL_SPEED && dist <= CONF.MIN_GOAL_DIST){
                this._world.destroyBody(item);
                item.isRemoved = true;
                this.emit(EVT_GOAL,item);
            }
        }
    }
}

module.exports = GoalChecker;