/**
 * Created by Mick on 17.12.2017.
 */

'use strict';

const Util = require('./../core/util');
const Config = require('./config');


const EVT_ON_SWING = "onSwing";


class PlayerActionManager extends PIXI.Container{

    constructor(sensitivity,max,lineSize,lineColor) {
        super();

        this.line = null;

        this.sensitivity = sensitivity || Config.SWING.SENSITIVITY;
        this.max = max || 20;

        this.lineWidth = lineSize || 5;
        this.lineColor = lineColor || "0x000000";

    }

    onPlayerMouseOver(evt){

    }

    onPlayerMouseOut(evt){
    }

    onPlayerMouseDown(evt){
        this.line = new PIXI.Graphics();

        this.line.entityPosition = {
            x : evt.entity.x,
            y : evt.entity.y
        };

        this.updateLine(
            evt.entity.x,
            evt.entity.y,
            evt.interaction.data.global.x,
            evt.interaction.data.global.y
        );

        this.addChild(this.line);
    }

    onPlayerMouseUp(evt){
        if(this.line && this.line.parent) {
            this.removeChild(this.line);
        }
    }

    onPlayerMouseUpOutside(evt){
        if(!this.line || !this.line.parent) {
            return; // nothing to do, when there is no line
        }

        //TODO: send swing event
    /*    let dist = Util.getVectorDistance(
            this.line.entityPosition.x,
            this.line.entityPosition.y,
            evt.interaction.data.global.x,
            evt.interaction.data.global.y
        );*/

        this.emit(EVT_ON_SWING,{
          //  strength:dist,
            target:evt.interaction.target,
            vector:{
                x:(this.line.entityPosition.x-evt.interaction.data.global.x)*this.sensitivity,
                y:(this.line.entityPosition.y-evt.interaction.data.global.y)*this.sensitivity
            }
        });

        this.removeChild(this.line);
    }

    onMouseMove(evt){
        if(!this.line || !this.line.parent) return; // nothing to do, when line is not visible

        this.updateLine(
            this.line.entityPosition.x,
            this.line.entityPosition.y,
            evt/*.data.global*/.x,
            evt/*.data.global*/.y
        );
    }

     /**
     *
     * @param fx from x
     * @param fy from y
     * @param tx to x
     * @param ty to y
     */
    updateLine(fx,fy,tx,ty){
        let s = this.lineWidth;
        let c = this.lineColor;

        this.line.clear();
        this.line.lineStyle(s, c);
        this.line.moveTo(fx,fy);
        this.line.lineTo(tx,ty);
    }
}

module.exports = PlayerActionManager;