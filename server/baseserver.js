/**
 * Created by Mick on 12.06.2017.
 */

'use strict';
const Packages = require('./../core/com');

//const Util = require('./../core/util');

const Ticks = require('./../core/ticks.json');

const uuidV1 = require('uuid/v1');
const EventEmitter3 = require("eventemitter3");
const UpdateQueue = require("./../core/updatequeue");

/**
 * TODO: heiraus alle server ableiten, e.g. LobbyConnectionHandler
 */
class BaseServer extends EventEmitter3{

    /**
     *
     * @param io
     * @param serverModules
     */
    constructor(io,gameID, ticks) {
        super();
        this.io = io;
        /**
         * id is the id of the game/server,
         * it is used to reference in the url
         * but it is also the namepsace of the socket.io room
         */
        this.id = gameID;

        if(!this.id) throw "no server id was passed - cannot create server";

     //   this.io.on('connection', this._onConnectionReceived.bind(this));

        this.serverModules = [];

        this.updateQueue =  new UpdateQueue();
        setInterval(this._sendEntityUpdates.bind(this), ticks || Ticks.SERVER_UPDATE_INTERVAL);

        /**
         * contains all sockets of the connected clients
         * necessary for broadcast
         * @type {Array}
         */
        // this.allSockets = [];
    }

    use(serverModule){
        if(!serverModule)
            throw "passed module does not exist";

        this.serverModules.push(serverModule);

        let sharedEvents = new EventEmitter3();

        serverModule.init({
            SERVER_ID:this.id,
            _broadcast:this._broadcast.bind(this),
            _broadcastExceptSender:this._broadcastExceptSender.bind(this),
            _sendToClient:this._sendToClient.bind(this),
            _postUpdate:this.updateQueue.postUpdate.bind(this.updateQueue),
            _sendErrorToClient:this._sendErrorToClient,
            _broadcastErrorToClient:this._broadcastErrorToClient,
            sharedEvents:sharedEvents,
            _on:this.on.bind(this)
        })
    }

    /**
     * Broadcasts the recent updates to all clients,
     * is called in an regular interval
     * @private
     */
    _sendEntityUpdates(){
        if(!this.updateQueue.updateRequired) return;
        this._broadcast(Packages.PROTOCOL.GENERAL.TO_CLIENT.UPDATE_STATE,Packages.createEvent(
            this.id,
            this.updateQueue.popUpdatedData()
            )
        );
    }

    onConnectionReceived(socket){
        // disconnect a new connection, when server is full
        if(this.isServerFull){
            console.warn("player limit reached, new request has to be prohibited");
            //TODO: sollte zu lobby redirecten und nicht disconnecten

            /*this._sendToClient(
                socket,
                Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR,
                Packages.createEvent(
                    this.ID,
                    {reason: Packages.PROTOCOL.GENERAL.NO_FREE_SLOT_AVAILABLE_ON_SERVER}
                )
            );*/
            this._sendErrorToClient(socket,Packages.PROTOCOL.GENERAL.NO_FREE_SLOT_AVAILABLE_ON_SERVER);

            socket.disconnect();
            return;
        }


        //removes this client from the serverclient list and broadcasts the information to all remaining clients
        socket._onDisconnect = this._onDisconnect.bind({self:this,socket:socket});
        socket.on('disconnect', socket._onDisconnect);

        //this.allSockets.push(socket);

        // create a function, which normalizes the user
        socket.getNormalizedUser = function () {
            return this.request.user || {
               // displayName: this.request.session.guestName,
                status : 0,// 0 is equal to "guest"
                id: socket.id
            };
        };

        // set the clientID, currently its the socketID
        // TODO: create new ID
        socket.clientId = socket.id;


        this._onConnectionReceived(socket);

        let initData={};

        // after the server has accepted the client,
        // init every other module
        for(let i=0; i< this.serverModules.length; i++){
            let d = this.serverModules[i].onConnectionReceived(socket);
            if(!d) continue;

            initData[this.serverModules[i].name] = d;
        }

        // share the initData to the newly connected client
        this._sendToClient(
            socket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.INIT_DATA,
            Packages.createEvent(
                this.id,
                initData
            )
        );
    }

    __onConnectionReceived(socket){
        throw "abstract method __onConnectionReceived - override it";
    }

    _onDisconnect (data) {
        if(!data){
            console.log("disconnect: no data received");
            return;
        }

        for(let i=0; i< this.self.serverModules.length; i++){
            this.self.serverModules[i].onConnectionLost(this.socket);
        }

        this.socket.removeListener('disconnect', this.socket._onDisconnect);
        delete this.socket._onDisconnect;

        this.self._broadcastExceptSender(
            this.socket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.CLIENT_DISCONNECTED,
            Packages.createEvent(
                this.self.id,
                {id: this.socket.id}
            )
        );
    }


    _broadcast(type,msg){
       // this.io.sockets.emit(type,msg);
       // this.io.in(this.id).emit(type,msg);
        this.io.to(this.id).emit(type,msg);
    }

    _broadcastExceptSender(senderSocket, type, msg){
        senderSocket.broadcast.emit(type,msg);
    }

    _sendToClient(clientConnectionSocket,type,msg){
        clientConnectionSocket.emit(type,msg);
    }

    _sendErrorToClient(clientSocket,reason){
        this._sendToClient(
            clientSocket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR,
            Packages.createEvent(
                this.id,
                {reason: reason}
            )
        );
    }

    _broadcastErrorToClient(reason){
        this._broadcast(
            Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR,
            Packages.createEvent(
                this.id,
                {reason: reason}
            )
        );
    }
}

module.exports = BaseServer;