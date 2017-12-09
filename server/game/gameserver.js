/**
 * Created by Mick on 19.05.2017.
 */
'use strict';

const Ticks = require('./../../core/ticks.json');

const Packages = require('./../../core/com');
const Util = require('./../../core/util');

const Rights = require('./../../core/rights');

//const uuidV1 = require('uuid/v1');

const UpdateQueue = require("./../../core/updatequeue");
//const EntityServerManager = require('./entityservermanager');
const ClientManager = require('./serverclientmanager');

const BaseServer = require('./../baseserver');

const EVT_ON_CLIENT_DISCONNECTED = "onClientDisconnected";
const EVT_ON_CLIENT_CONNETED = "onClientConnected";

const EVT_ON_STATE_UPDATE_RECEIVED = "onStateUpdateReceived";
const EVT_ON_STATE_UPDATE_RECEIVED_SEPERATOR = "_";

class GameServer extends BaseServer{

    constructor(io,gameID, maxPlayers){
        super(io,gameID);
        this.maxPlayers = maxPlayers || Ticks.MAX_PLAYERS;

        // be sure, the max player count is not bigger than possible
        if(this.maxPlayers > Ticks.MAX_PLAYERS){
            this.maxPlayers = Ticks.MAX_PLAYERS;
        }

        this.clientManager = new ClientManager();
        this.updateQueue =  new UpdateQueue();
       // this.entityServerManager = new EntityServerManager(60,this.updateQueue,this.clientManager,this);
        //this.entityServerManager.on('afterUpdate',this._processReceivedUpdateQueue.bind(this));

        /**
         * all updates, which are received by the clients are stored in this array
         * and processed, before a physic engines step
         * @type {Array}
         */
        this.receivedUpdateQueue = [];

        setInterval(this._sendEntityUpdates.bind(this), Ticks.SERVER_UPDATE_INTERVAL);

    //    this.entityServerManager.loadGame("mick","codewords"); //TODO nicht statisch machen und durch user triggern lassen

        /**
         * contains all sockets of the connected clients
         * necessary for broadcast
         * @type {Array}
         */
        this.allSockets = [];

        console.log("GameServer started, ID:",this.ID);
    }

    get currentState(){
        return {
            CURRENT_PLAYERS:this.currentConnectionCount
        }
    }

    /**
     * Broadcasts the recent updates to all clients,
     * is called in an regular interval
     * @private
     */
    _sendEntityUpdates(){
        if(!this.updateQueue.updateRequired) return;
        this._broadcast(Packages.PROTOCOL.GENERAL.TO_CLIENT.UPDATE_STATE,Packages.createEvent(
            this.ID,
            this.updateQueue.popUpdatedData()
            )
        );
    }

    get currentConnectionCount(){
        return this.clientManager.currentConnectionCount;
    }

    get isServerFull(){
        return this.clientManager.currentConnectionCount >= this.maxPlayers;
    }

    /**
     * is called once for every client who connects,
     * everything necessary for the gameplay / client is initialized here
     *
     * is called by the superclass
     *
     * @param socket of the connected client
     * @private
     */
    _onConnectionReceived(socket) {
        this.allSockets.push(socket);
        this._initClient(socket);

        socket._onClientValueUpdate = this._onValueUpdateReceived.bind({self:this,socket:socket});
        socket.on(Packages.PROTOCOL.GENERAL.TO_SERVER.CLIENT_VALUE_UPDATE,socket._onClientValueUpdate );

        // server receives client entity updates in this event
        socket._onClientStateUpdate = this._onClientStateUpdate.bind({self:this,socket:socket});
        socket.on(Packages.PROTOCOL.GENERAL.TO_SERVER.SEND_STATE, socket._onClientStateUpdate);
    }

    /**
     * a new client enters the server,
     * distribute the information about the client to itself and to every other player
     * @param socket
     */
    _initClient(socket){
        let clientInfo = {};// TODO: load clientinfo from database/redis/cookie???

        // if the user is a guest, give him a random name
        if(!clientInfo.name || clientInfo.userStatus === Rights.RIGHTS.guest){
            clientInfo.name = this.clientManager.getRandomName();
        }

        // connect client to this server
        this.clientManager.clientConnected(socket,clientInfo);

        let newlyConnectedClient = this.clientManager.getClient(socket.id);

        this.emit(EVT_ON_CLIENT_CONNETED,{
            socket:socket,
            client:newlyConnectedClient
        });

        // share info with client (that he is connected and his own info)
        this._sendToClient(
            socket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.RESPONSE_CLIENT_ACCEPTED,
            Packages.createEvent(
                this.ID,
                {
                    clientInfo:newlyConnectedClient.privateInfo,
                    serverID: this.ID
                }
            )
        );

        // share info about all other players with newly connected client
        let alreadyKnownClients = this.clientManager.getAllPublicClientInfo(socket.id);
        if(alreadyKnownClients && alreadyKnownClients.length >0) {
            this._sendToClient(
                socket,
                Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_CONNECTED,
                Packages.createEvent(
                    this.ID,
                    this.clientManager.getAllPublicClientInfo(socket.id)
                )
            );
        }

        // share public info of newly connected client with everyone
        this._broadcastExceptSender(
            socket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_CONNECTED,
            Packages.createEvent(
                this.ID,
                [this.clientManager.getClient(socket.id).publicInfo]
            )
        );


        // TEST INIT, should be in module
        let path = require('path').join(appRoot,"public/maps","testmap"+".json");
        this._currentMap = JSON.parse(require('fs').readFileSync(path).toString());
        this._sendToClient(socket,
            Packages.PROTOCOL.GAME.MINIGOLF.TO_CLIENT.MAP,
            Packages.createEvent(this.ID,{
                width:this._currentMap.map.width,
                height:this._currentMap.map.height,
                tilesize:this._currentMap.map.tilesize,
                data:this._currentMap.map.data
            })
        );
    }

    /**
     * called from super class/ overrides superclass
     * @param data
     * @private
     */
    _onDisconnect (data) {
        super._onDisconnect(data);
        this.socket.removeListener(Packages.PROTOCOL.GENERAL.TO_SERVER.CLIENT_VALUE_UPDATE, this.socket._onClientValueUpdate);
        delete this.socket._onClientValueUpdate;

        this.socket.removeListener(Packages.PROTOCOL.GENERAL.TO_SERVER.SEND_STATE, this.socket._onClientStateUpdate);
        delete this.socket._onClientStateUpdate;

        if(!this.self.clientManager.doesClientExist(this.socket.id)){
            console.log("user who disconnects does not exist!");
            return;
        }

        this.self.allSockets = Util.removeByValue(this.self.allSockets,this.socket);

        //this.self.entityServerManager.releaseAllContraintsForUser(this.socket.id);

        this.self.emit(EVT_ON_CLIENT_DISCONNECTED,data,this.socket);

        this.self.clientManager.clientDisconnected(this.socket, data);
    }

    _onValueUpdateReceived (evt) {
        if(!evt || !evt.data){
            console.log("CLIENT_VALUE_UPDATE: no data received");
            return;
        }
        if(!this.self.clientManager.doesClientExist(evt.senderID)){
            console.log("message received from not existing client!",evt.senderID);
            return;
        }

        if(!this.self.clientManager.verificateClient(evt.senderID,evt.token)){
            console.warn("User sends unverificated messages!",evt.senderID,this.socket.handshake.address,Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_VALUE_UPDATE);
            return;
        }

        let violations = this.self._processClientValueUpdates(evt);
        if(violations.length <=0) {
            this.self._broadcast(    // if the change was valid, send everyone the new information
                Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_VALUE_UPDATE,
                Packages.createEvent(
                    this.self.ID,
                    {
                        clientID: evt.senderID,
                        changes: evt.data
                    }
                )
            );
        }else{  // otherwise send the rejection reasons
            this.self._sendToClient(
                this.socket,
                Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_VALUE_UPDATE_REJECTED,
                Packages.createEvent(
                    this.self.ID,
                    {
                        violations: violations
                    }
                )
            );
        }
    }

    _onClientStateUpdate(evt) {
        if(!evt || !evt.data){
            console.log("SEND_STATE: no data received");
            return;
        }
        if(!this.self.clientManager.doesClientExist(evt.senderID)){
            console.log("message received from not existing client!",evt.senderID);
            return;
        }

        if(!this.self.clientManager.verificateClient(evt.senderID,evt.token)){
            console.warn("User sends unverificated messages!",evt.senderID,this.socket.handshake.address,Packages.PROTOCOL.CLIENT.SEND_STATE);
            return;
        }

        // the received updates are processes everytime before the engine is processed.
        this.self.receivedUpdateQueue.push(evt.data);
    }

    /**
     *
     * @returns {[]} returns an empty array, if everything is valid, otherwise, an array with rejection reasons is returned
     * @private
     */
    _processClientValueUpdates(evt){
        let result = [];
        for(let i=0; i<evt.data.length;i++) {
            let cur = evt.data[i];
            let rejectionReason = null;
            switch (cur.key) {
                case Packages.PROTOCOL.GENERAL.CLIENT_VALUES.COLOR:
                    rejectionReason=this.clientManager.updateClientColor(evt.senderID, cur.value);
                    break;
                case Packages.PROTOCOL.GENERAL.CLIENT_VALUES.PLAYER_INDEX:
                    rejectionReason = this.clientManager.updateClientIndex(evt.senderID, cur.value);
                    break;
                case Packages.PROTOCOL.GENERAL.CLIENT_VALUES.NAME:
                    rejectionReason = this.clientManager.updateClientName(evt.senderID, cur.value);
                    break;
            }

            if(rejectionReason){
                result.push({key:cur.key,reason:rejectionReason});
            }
        }
        return result;
    }

    /**
     * processes the received updates
     * TODO: call somewhere in the MATTER.JS
     * @private
     */
    processReceivedUpdateQueue(){
        let currentQueue = this.receivedUpdateQueue;
        this.receivedUpdateQueue = [];
        for(let i=0; i< currentQueue.length;i++){
            this._processUpdates(currentQueue[i]);
        }
    }

    /**
     * process the posted updates of all players
     * @param data
     * @private
     */
    _processUpdates(data){
        for(let type in data){
            if(!data.hasOwnProperty(type)) continue;
            for(let id in data[type]) {
                if(!data[type].hasOwnProperty(id)) continue;

                if(!this.clientManager.doesClientExist(id)){
                    console.log("_processUpdates: user does not exist!");
                    continue;
                }

                if(!this.clientManager.isClientReady(id)){
                    //console.log("_processUpdates: client",id,"is not ready");
                    continue;
                }

                this.emit(EVT_ON_STATE_UPDATE_RECEIVED+EVT_ON_STATE_UPDATE_RECEIVED_SEPERATOR+id,{
                    id:id,
                    type:type,
                    data:data[type][id]
                });
            }

            this.emit(EVT_ON_STATE_UPDATE_RECEIVED,{
                type:type,
                data:data[type]
            });
        }
    }

    /*   _onChatMessageReceived (evt) {
        if(!evt || !evt.data){
            console.log("CLIENT_CHAT_MSG: no data received");
            return;
        }
        if(!this.self.clientManager.doesClientExist(evt.senderID)){
            console.log("message received from not existing client!",evt.senderID);
            return;
        }

        if(!this.self.clientManager.verificateClient(evt.senderID,evt.token)){
            console.warn("User sends unverificated messages!",evt.senderID,this.socket.handshake.address,Packages.PROTOCOL.MODULES.CHAT.CLIENT_CHAT_MSG);
            return;
        }

        if(!evt.data.message){
            return; // no chat message to share
        }

        this.self._broadcast(    // if the change was valid, send everyone the new information
            Packages.PROTOCOL.MODULES.CHAT.SERVER_CHAT_MSG,
            Packages.createEvent(
                this.self.ID,
                {
                    clientID: evt.senderID,
                    type:"user",
                    message: evt.data.message
                }
            )
        );
    }*/
}

module.exports = GameServer;