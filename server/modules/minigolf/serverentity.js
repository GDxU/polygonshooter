/**
 * Created by Mick on 10.12.2017.
 */

'use strict';

const uuidV1 = require('uuid/v1');
const Matter = require('matter-js');

const Bodies = Matter.Bodies;
const Body = Matter.Body;

const Util = require('./../../../core/util');

const MinigolfConf = require('./minigolfconf.json');

const MODES= require('./../../../core/entiymodes.json');
const ENTITYDESC = require('./../../../core/entitydescription.json');

class ServerEntity{
    constructor(data){
        this.id=uuidV1();
        /**
         * optional player ID, if the entity corresponds to a player
         */
        this.clientId = data.clientId;

        this._body = null;

        this.type = data.type || ENTITYDESC.NONE.name;

      //  this._state = this._createDefaultEntityState();
        // set the position of the _body
        let x=(data.position || {}).x || 0;
        let y=(data.position || {}).y || 0;
        let rotation=data.rotation || 0;

        this.hitArea = data.hitArea;
        switch (data.hitArea.type) {
            case "circle":
                this._body = Bodies.circle(x,y,data.hitArea.radius);
                break;
            case "rectangle":
                this._body = Bodies.rectangle(x,y,data.hitArea.width,data.hitArea.height);
                break;
            default:
                throw "insuficient data in order to create the entity _body";
        }

        this._body.ENTITY_ID = this.id;
        this._body.entity = this;

        if(rotation) { //just rotate, if rotation is not equaling zero
            Body.rotate(this._body, rotation);
        }

        this._body.frictionAir = MinigolfConf.ENTITY_FRICTION;

        /**
         * name of the current mode
         * @type {string}
         */
        this._currentMode = "";
        this.setMode(MODES.DEFAULT);    // set default mode
        //------------------callbacks------------------------------------

        /**
         * should just be set from the gameManager!
         * if true, then the entity is set to the gameManager/ world
         * @type {boolean}
         */
        this.isAddedToWorld = false;
    }


    get currentMode(){
        return this._currentMode;
    }

    /**
     * read only, do not try to overwrite, becuase it changes the velocity of the body
     * @returns {{x, y}}
     */
    get position() {
        let p = (this._body || {}).position || {};
        return {
            get x() {
                return p.x || 0;
            },
            get y() {
                return p.y || 0;
            }
        }
    }

    /**
     *sets the position of an enitty
     * @param v {{x, y}}
     */
    set position(v){
        Body.setPosition(this._body, {
            x: v.x || 0,
            y: v.y || 0
        });
    }

    get velocity() {
        let p = (this._body || {}).velocity || {};
        return {
            get x() {
                return p.x || 0;
            },
            get y() {
                return p.y || 0;
            }
        }
    }

    set velocity(v){
        Body.setVelocity(this._body, {
            x: v.x || 0,
            y: v.y || 0
        });
    }

    get angularVelocity() {
        let p = (this._body || {}).angularVelocity || 0;
        return p;
    }

    set angularVelocity(v){
        Body.setAngularVelocity(this._body, v);
    }


    get body(){
        return this._body;
    }

    get state(){
        return this._state;
    }

    get rotation(){
        return this._body.angle;
    }

    /**
     * sets the rotation of the entity directly
     * @param v
     */
    set rotation(v){
        if(typeof v !== "number"){
            console.log("rotation can only be a number!");
            return;
        }
        Body.rotate(this._body,v);
    }

    /**
     * uses velocity to rotate the entity
     * @param rotationAmount
     */
    rotateEntity(rotationAmount){
        // multiply the passed value by the rotation speed
        Body.setAngularVelocity(this._body,rotationAmount);
        // changes will be postet in the engine.update overrite method,
        // because the changes are done during the enigne step
    }

    /**
     *
     * @param mode
     * @returns {boolean} true, if mode was changed
     */
    setMode(mode){
        let old = this._currentMode;
        switch (mode){
            case MODES.MOVING:
                //this._body.frictionAir = MinigolfConf.GRABBED_ENTITY_FRICTION;
                //this._body.isSensor = true;
        //        this._currentMode = MODES.MOVING;
                break;
            case MODES.OUT:
                this._body.isStatic = true;
         //       this._currentMode = MODES.OUT;
                break;
            case MODES.QUIT:
                this._body.isStatic = true;
                this.velocity = {x:0,y:0};
        //        this._currentMode = MODES.QUIT;
            break;
            //case MODES.SPAWNED:
            //    break;
            case MODES.DEFAULT:
            default:
                this._body.isStatic = false;
                this.velocity = {x:0,y:0};
                //this._body.frictionAir = MinigolfConf.ENTITY_FRICTION;
                //this._body.collisionFilter=MinigolfConf.DEFAULT_COLISION_FILTER;
                //this._body.isSensor = false;
                //      this._currentMode = MODES.DEFAULT;
                break;
        }

        this._currentMode = mode;

        return old !== this._currentMode;
    }

    /**
     * overrides and extends the base data
     * @return {{position: *, rotation: *, ID: *, state: ({state, timestamp}|{state: string, timestamp: number}|*), classification: (*|string), type: (*|string), width: *, height: *, isStackable: (boolean|*), isTurnable: (boolean|*), surfaceIndex: (number|*), surfaces: *, hitArea: *}}
     */
    toJSON(){
        return {
            position:this.position,
            rotation:this.rotation,
            id:this.id,
            type:this.type,
            clientId: this.clientId,
       //     state:this._state,
            hitArea:this.hitArea,
            mode:this._currentMode
        };
    }
}
module.exports = ServerEntity;