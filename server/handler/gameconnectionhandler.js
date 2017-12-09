/**
 * Created by Mick on 12.06.2017.
 */

'use strict';
const GameServer = require('./../game/gameserver');
const Packages = require('./../../core/com');

const MinigolfModule = require('./../modules/minigolf/minigolfmodule');

class GameConnectionHandler {

    constructor(io) {
        this.io = io;
        this.io.on('connection', this._onConnectionReceived.bind(this));

        /**
         * contains all game instances
         * @type {{id:GameServer}}
         */
        this.runningGames = {};

        this.startGame();       //TODO: sollte von spielenr aufgerufenwerden
    }

    _onConnectionReceived(socket){
        if(socket.forceDisconnected) return;
        console.log("connection received from:"+socket.handshake.address);

        let gameID = socket.handshake.query.gameid;

        if(!gameID || !this.runningGames[gameID]) {
            socket.emit(Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR, {data:{reason:Packages.PROTOCOL.GENERAL.ERRORS.NO_FREE_SLOT_AVAILABLE_ON_SERVER}});       //TODO: entfernen
            console.log(socket.handshake.address,"wants to connect to an invalid seassion:",gameID);
            socket.disconnect();
            return;
        }

        let game = this.runningGames[gameID];

        if(game.isServerFull){
            socket.emit(Packages.PROTOCOL.GENERAL.TO_CLIENT.ERROR, {data:{reason:Packages.PROTOCOL.GENERAL.ERRORS.NO_FREE_SLOT_AVAILABLE_ON_SERVER}});
            console.log(socket.handshake.address,"wants to connect to a full server:",gameID);
            socket.disconnect();
            return;
        }

        socket.join(gameID);

      /*  var onevent = socket.onevent;
        socket.onevent = function (packet) {
            onevent.call (this, packet);
            if(socket.request.session) {
                socket.request.session.touch();
            }
        };*/


        game.onConnectionReceived(socket);
    }

    startGame(){
        let gameID = "testID"; // uuidV1();
        console.log("starting new game with id",gameID);

        let newServer = new GameServer(this.io,gameID,6);
        newServer.use(new MinigolfModule());
        // TODO: später anstat gameID, newServer.ID verwenden
        // gameID = newServer.ID;
        this.runningGames[gameID] = newServer;

        return gameID;
    }
}

module.exports = GameConnectionHandler;