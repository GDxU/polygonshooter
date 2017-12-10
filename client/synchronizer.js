/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const Ticks = require('./../core/ticks.json');
const Packages = require("./../core/com");
const UpdateQueue = require('./../core/updatequeue');

const EventEmitter3 = require('eventemitter3');

//var GameState = require("./gamestate");

//var EntityManager = require("./entitymanager");

//TODO: in evts json
const EVT_ON_CLIENT_VALUE_REJECTED = "onClientValueRejected";
const EVT_ON_CLIENT_VALUE_UPDATE = "onClientValueUpdate";

const EVT_ON_CLIENT_ACCEPTED = "onClientAccepted";
const EVT_ON_INIT_GAME = "onInitGame";

const EVT_ON_CLIENT_CONNECTED = "onClientConnected";
const EVT_ON_CLIENT_DISCONNECTED = "onClientDisconnected";

const EVT_ON_SERVER_ERROR = "onServerError";

const EVT_ON_SERVER_UPDATE = "onServerUpdate";
const EVT_ON_SERVER_UPDATE_SEPERATOR = "_";

/**
 * Receives all data from the server and changed data from the client and distributes it.
 */
class Synchronizer extends EventEmitter3{
    constructor(supportedMessages){
        super();
        this.socket = null;

        /**
         *  contains all necessary client infos
         * @type {object} like{
         * socket,
            id,
            color,
            name
            }
         */
        this.CLIENT_INFO = {};

        /**
         * used to detect updates which were done by the client
         * @type {EntityUpdateQueue}
         */
        this.updateQueue = new UpdateQueue();

        /**
         * socket to connect to the server
         * @type {null}
         */
        this.socket = null;

        /**
         * contains the timestamp of the last received gameState update
         * @type {number}
         */
        this.lastGameStateUpdateEventTimeStamp = 0;

        /**
         * contains the last time when the gameState updates was processed
         * @type {number}
         */
        this.lastGameStateUpdateTimeStamp = 0;

        /**
         * once the client is connected,
         * he receives the ID of the server
         * @type {string}
         */
        this.connectedServerID = "";

        /**
         * contains all supported statUpdate
         * @type {Set<any>}
         * @private
         */
        this._suppotedMessages = new Set();

        this.addSupportedMessages(supportedMessages);
    }

    /**
     * pass "TO_CLIENT" object of one section of the PROTOCOL from com.js
     * @param msgObject TO_CLIENT{msgName:"msg"}
     */
    addSupportedMessages(msgObject){
        let cur = [].concat(msgObject);
        for(let curObj of cur) {
            for (let k in curObj) {
                this._suppotedMessages.add(curObj[k]);
            }
        }
    }

    removeSupportedMessages(msgObject){
        let cur = [].concat(msgObject);
        for(let curObj of cur) {
            for (let k in curObj) {
                this._suppotedMessages.delete(curObj[k]);
            }
        }
    }

    start(){
        if (this.socket){
            console.warn("synchronizer already initialized!");
            return;
        }

        this.socket = require('socket.io-client').connect(Packages.NAMESPACES.MINIGOLF, {
            query:"gameid="+GAME_ID
        });
        this._initHandlers();
    }

    /**
     * sends game updates from client to server, if changes are detected,
     * is started as soon as client_info is received
     * @private
     */
    _startUpdating(){
        //this interval sends the entityupdates.
        this.updateQueue.flush();
        setInterval(function(){
            if(!this.updateQueue.updateRequired) return;

            this.sendPackage(Packages.PROTOCOL.GAME.MINIGOLF.TO_SERVER.SEND_STATE,Packages.createEvent(
                this.CLIENT_INFO.id,
                this.updateQueue.popUpdatedData(),
                this.CLIENT_INFO.token
                )
            );
        }.bind(this),Ticks.CLIENT_UPDATE_INTERVAL);
    }

    /**
     * init all socket handlers,
     * if data was sent by the server, this method (to be more exact, the handlers initialized in this method),
     * receives and processes/distributes it.
     * @private
     */
    _initHandlers(){
        // get clientdata of this client
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.RESPONSE_CLIENT_ACCEPTED, this._onClientAccepted.bind(this));

        // receive data about the dame (after initialisation, or gamechange
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.INIT_DATA, this._onInitGame.bind(this));

        // receive game updates
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.UPDATE_STATE, this._onStateUpdate.bind(this));

        // another player connected
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_CONNECTED, this._onClientConnected.bind(this));

        // an client disconnects
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_DISCONNECTED, this._onClientDisconnected.bind(this));

        // a value of a client/player has changed
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_VALUE_UPDATE, this._onClientValueUpdate.bind(this));

        // if value reject from serveris received
        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_VALUE_UPDATE_REJECTED, this._onClientValueUpdateRejected.bind(this));

        this.socket.on('disconnect', this._onDisconnect.bind(this));

        this.socket.on(Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR,this._onServerError.bind(this));

        // apply listeners for all supported messages
        for(let msg of this._suppotedMessages){
            this.socket.on(msg, (evt)=>{
                this.emit("on"+msg,evt.payload);
            });
        }
    }

    _remmoveHandlers(){
        this.socket.removeAllListeners();
    }

    _onClientAccepted(evt) {
        if(this.connectedServerID) return;    // another received package could be from another game, to which the client is connected

        this.connectedServerID = evt.payload.serverID;
        this.CLIENT_INFO = evt.payload.clientInfo;
        console.log("Clientdata received");

        this.emit(EVT_ON_CLIENT_ACCEPTED,evt.payload.clientInfo);

        this._startUpdating();
        window.hideLoadingDialog();
    }

    _onInitGame (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        this.lastGameStateUpdateEventTimeStamp=this.lastGameStateUpdateTimeStamp = new Date().getTime();
        this.emit(EVT_ON_INIT_GAME,evt.payload);
    }

    _onStateUpdate (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        if(evt.timeStamp < this.lastGameStateUpdateEventTimeStamp) return;    // if update is old, do not apply it
        let currentTime = new Date().getTime();
        this.processServerUpdates(evt.payload,currentTime-this.lastGameStateUpdateTimeStamp);
        this.lastGameStateUpdateEventTimeStamp = evt.timeStamp;
        this.lastGameStateUpdateTimeStamp = currentTime;
    }

    _onClientConnected (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        this.emit(EVT_ON_CLIENT_CONNECTED,evt.payload);
    }

    _onClientDisconnected (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        this.emit(EVT_ON_CLIENT_DISCONNECTED,evt.payload);
    }

    _onClientValueUpdate (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        this.emit(EVT_ON_CLIENT_VALUE_UPDATE,evt.payload);
    }

    _onClientValueUpdateRejected (evt) {
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }
        this._handleValueRejections(evt.payload);
    }

    _onDisconnect(evt) {
        console.log("DISCONNECT",evt);
        // disconnect kann nur ein error sein
        this._remmoveHandlers();
    }

    _onServerError(evt){
        alert(evt.payload.reason);
        if(!this._vertifyServer(evt.senderID)){console.log("message is not from server"); return; }

      /*  if(evt.data.reason == Packages.PROTOCOL.GAME_SERVER_ERRORS.NO_FREE_SLOT_AVAILABLE){
            // TODO: redirect to lobby
        }
        if(evt.data.reason == Packages.PROTOCOL.GAME_SERVER_ERRORS.GAME_NOT_FOUND){
            // TODO: redirect to lobby
        }*/

        this.emit(EVT_ON_SERVER_ERROR,evt.payload);

        //TODO: redirect to lobby
        this._remmoveHandlers();
    }

    /**
     * handles value rejectsions from the server
     * @param evt
     * @private
     */
    _handleValueRejections(evt){
        for(let i=0; i<evt.violations.length;i++) {
            let reason = evt.violations[i];
            this.emit(EVT_ON_CLIENT_VALUE_REJECTED,reason);
        }
    }

    /**
     * checks if id is the current server
     * @param id
     * @returns {*|boolean}
     * @private
     */
    _vertifyServer(id){
        return id && id === this.connectedServerID;
    }

    sendPackage(type, msg){
        this.socket.emit(type,msg);
    }

    /**
     * processes the batched updates, received from the server
     * @param updateData
     * @param timeSinceLastUpdate the time since the last update was received from the server
     */
    processServerUpdates(updateData,timeSinceLastUpdate){
        this.emit(EVT_ON_SERVER_UPDATE,{
            updates:updateData,
            timeSinceLastUpdate:timeSinceLastUpdate
        });

        for(let type in updateData){
            if(!updateData.hasOwnProperty(type)) continue;

            let updates = updateData[type];

            this.emit(EVT_ON_SERVER_UPDATE+EVT_ON_SERVER_UPDATE_SEPERATOR+type,{
                type:type,
                updates:updates,
                timeSinceLastUpdate:timeSinceLastUpdate
            });
        }
    }
}

module.exports = Synchronizer;