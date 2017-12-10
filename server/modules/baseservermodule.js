/**
 * Created by Mick on 22.06.2017.
 */

'use strict';
const uuidV1 = require('uuid/v1');

class BaseServerModule {

    constructor(name) {
        this.SERVER_ID = "";

        this._name = name || uuidV1();

        /* functions to send data, received from the server instance */
        this._broadcast = null;
        this._broadcastExceptSender = null;
        this._sendToClient = null;
        this._postUpdate = null;
        this._sendErrorToClient = null;
        this.on = null; // eventlistener of the server

        this.sharedEvents = null;
    }

    get name(){
        return this._name;
    }

    /*
    this.updateQueue.postUpdate(
                        Packages.PROTOCOL.GAME_STATE.ENTITY.SERVER_ENTITY_VALUE_CHANGED,
                        stack.ID,
                        {
                            changes:[
                                {
                                    keyPath:"surfaces",
                                    value:stack.surfaces
                                },
                                {
                                    keyPath:"surfaceIndex",
                                    value:stack.surfaceIndex
                                }
                            ],
                            _mode:"push"
                        }
                    );
     */

    /**
     * callded, when the module is added to the server
     * @param data
     */
    init(data){
        this.SERVER_ID = data.SERVER_ID;
        this._broadcast = data._broadcast;
        this._broadcastExceptSender = data._broadcastExceptSender;
        this._sendToClient = data._sendToClient;
        this._postUpdate = data._postUpdate;
        this._sendErrorToClient = data._sendErrorToClient;
        this._broadcastErrorToClient = data._broadcastErrorToClient;
        this.sharedEvents = data.sharedEvents;
        this.on = data._on; // eventlistener of the server
    }

    /**
     * called, when a connection of a client is received
     * @param socket
     *
     * @returns initData object, which is sent to the client
     */
    onConnectionReceived(socket){
        throw "abstract-method";
    }


    onConnectionLost(socket){
        throw "abstract-method";
    }

    tearDown(){
        //TODO: implement teardown method
    }
}

module.exports = BaseServerModule;