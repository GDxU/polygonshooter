/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const io = require('socket.io-client');
const EventEmitter3 = require('eventemitter3');

const com = require('./../core/com');


class Synchronizer extends EventEmitter3 {

    constructor() {
        super();

        this.EVTS ={
            MAP:"MAP"
        }
    }

    start(){
        this._socket = io('http://localhost:3000');

        this._socket.on('connect', function(){
            console.log("connected");
        });
        this._socket.on(com.PROTOCOL.GAME.TO_CLIENT.MAP, (data)=>{
            console.log(com.PROTOCOL.GAME.TO_CLIENT.MAP,data);
            this.emit(this.EVTS.MAP,data.payload);
        });


        this._socket.on('disconnect', function(){});
    }

}

module.exports = Synchronizer;