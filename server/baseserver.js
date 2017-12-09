/**
 * Created by Mick on 12.06.2017.
 */

'use strict';
const Packages = require('./../core/com');

const Util = require('./../core/util');

const uuidV1 = require('uuid/v1');
const EventEmitter3 = require("eventemitter3");

/**
 * TODO: heiraus alle server ableiten, e.g. LobbyConnectionHandler
 */
class BaseServer extends EventEmitter3{

    /**
     *
     * @param io
     * @param serverModules
     */
    constructor(io,serverID) {
        super();
        this.io = io;
        this.ID = serverID || uuidV1();
     //   this.io.on('connection', this._onConnectionReceived.bind(this));

        this.serverModules = [];

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

        serverModule.init({
            SERVER_ID:this.ID,
            _broadcast:this._broadcast.bind(this),
            _broadcastExpectSender:this._broadcastExceptSender.bind(this),
            _sendToClient:this._sendToClient.bind(this)
        })
    }

    onConnectionReceived(socket){

        // disconnect a new connection, when server is full
        if(this.isServerFull){
            console.warn("player limit reached, new request has to be prohibited");
            //TODO: sollte zu lobby redirecten und nicht disconnecten

            this._sendToClient(
                socket,
                Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR,
                Packages.createEvent(
                    this.ID,
                    {reason: Packages.PROTOCOL.GENERAL.NO_FREE_SLOT_AVAILABLE_ON_SERVER}
                )
            );

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
                displayName: this.request.session.guestName,
                status : 0 // 0 is equal to "guest"
            };
        };

        this._onConnectionReceived(socket);

        for(let i=0; i< this.serverModules.length; i++){
            this.serverModules[i].onConnectionReceived(socket);
        }

        // share info with client (that he is connected and his own info)
       /* this._sendToClient(
            socket,
            Packages.PROTOCOL.GENERAL.TO_CLIENT.RESPONSE_CLIENT_ACCEPTED,
            Packages.createEvent(
                this.ID,
                {
                    clientInfo:{},
                    serverID: this.ID
                }
            )
        );*/
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
                this.self.ID,
                {id: this.socket.id}
            )
        );
    }


    _broadcast(type,msg){
        //this.io.sockets.emit(type,msg);
        this.io.emit(type,msg);
    }

    _broadcastExceptSender(senderSocket, type, msg){
        senderSocket.broadcast.emit(type,msg);
    }

    _sendToClient(clientConnectionSocket,type,msg){
        clientConnectionSocket.emit(type,msg);
    }
}

module.exports = BaseServer;