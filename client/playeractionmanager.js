/**
 * Created by Mick on 17.12.2017.
 */

'use strict';

class PlayerActionManager {

    constructor() {

    }

    onPlayerMouseOver(evt){
        console.log(1,evt);
    }

    onPlayerMouseOut(evt){
        console.log(1,evt);
    }

    onPlayerMouseDown(evt){
        console.log(1,evt);
    }

    onPlayerMouseUp(evt){
        console.log(1,evt);
    }

    onPlayerMouseUpOutside(evt){
        console.log(1,evt);
    }
}

module.exports = PlayerActionManager;