/**
 * Created by Mick on 03.12.2017.
 */

'use strict';

const Rights = require('./../../core/rights');
const Util = require('./../../core/util');
const Ticks = require('./../../core/ticks.json');
const SharedConfig = require('./../../core/sharedconfig');

const BadwordsFilter = require('bad-words');

const uuidV1 = require('uuid/v1');

const COLORS = require('./../../core/resources/colors');
const RANDOM_NAMES = require('./../resources/random_names.json');
const ADJECTIVES = require('./../resources/adjectives.json');


class Client{
    constructor(socket,clientInfo){

        if(!socket || !clientInfo)
            throw "no socket or clientInfo, client cannot get instantiated";

        this.socket = socket;
        this.color = clientInfo.color >= 0 ? clientInfo.color : -1;    // index of the color (determined in colors.json
        this.displayName = clientInfo.displayName || "anonymous";
        this.userStatus = clientInfo.userStatus || 0;
        this.cursor = clientInfo.cursor || "default";
        this.playerIndex = clientInfo.playerIndex >= 0?clientInfo.playerIndex:-1;
        this.verification = uuidV1();
        this.id = clientInfo.id;
    }

   /* get ID(){
        return this.id;
    }*/

    get privateInfo(){
        return {
            id:this.id,
            displayName:this.displayName,
            userStatus:this.userStatus,
            color:this.color,
            cursor:this.cursor,
            playerIndex:this.playerIndex,
            token:this.verification
        };
    }

    get publicInfo (){
        return {
            id:this.id, //TODO: sollte beim clienten nicht gesendet werden- am client nur mit playerIndex arbeiten
            displayName:this.displayName,
            userStatus:this.userStatus,
            color:this.color,
            cursor:this.cursor,
            playerIndex:this.playerIndex
        };
    }
}

class ClientManager{

    constructor(){
        this.clients = {};
        this.admin=null;

        /**
         * contains the player assignedPlayerIndexes aka seats, false means,
         * the seat is free, otherwise the id of the player will be put in the cell,
         * if an ID is in an array cell instead of "false" this means, the seat was taken by a user
         * @type {boolean[]}
         */
        this.assignedPlayerIndexes= [];
        for(let i=0; i< SharedConfig.MAX_PLAYERS;i++){
            this.assignedPlayerIndexes.push(false);
        }

        this.assignedColors = {};

        /**
         * contains all names, which are already used by another player.
         * NOTE: names are just stored in lowercase!
         * @type {{name,id}}
         */
        this.assignedNames = {};

        this._currentConnectionCount = 0;

        this.badWordsFilter = new BadwordsFilter();
    }

    get currentConnectionCount(){
        return this._currentConnectionCount;
    }

    /**
     *  initializes this client on the server
     * @param socket
     * @param clientInfo
     */
    _addClient(socket, clientInfo){
        // assign prefered color to client
        // if color of client is set, and available, set it as client color,
        // else search for a free color
        if(typeof clientInfo.color === 'number' && clientInfo >=0  && !this.assignedColors[clientInfo.color] ){
            this.assignedColors[clientInfo.color] = clientInfo.id;
        }else{
            for(let c=0; c < COLORS.PLAYERS_COLORS.length; c++){
                // if color already assigned, continue
                if(this.assignedColors[c] || this.assignedColors[c] === 0) continue;
                // otherwise set the color and break
                clientInfo.color = c;
                this.assignedColors[c] = clientInfo.id;
                break;
            }
        }

        // assign prefered color to client
        // if playerIndex of client is set, and available, set it as playerIndex,
        // else search for a free playerIndex
        if(typeof clientInfo.playerIndex === 'number' && clientInfo >=0  && !this.assignedPlayerIndexes[clientInfo.playerIndex] ){
            this.assignedPlayerIndexes[clientInfo.playerIndex] = clientInfo.id;
        }else{
            for(let pi=0; pi < SharedConfig.MAX_PLAYERS; pi++){
                // if playerIndex already assigned, continue
                if(this.assignedColors[pi] || this.assignedColors[pi] === 0) continue;
                // otherwise set the playerIndex and break
                clientInfo.playerIndex = pi;
                this.assignedPlayerIndexes[pi] = clientInfo.id;
                break;
            }
        }

        // if the user is a guest, give him a random name
        if(!clientInfo.displayName || clientInfo.userStatus === Rights.RIGHTS.guest){
            clientInfo.displayName = this.getRandomName();
        }


        this.clients[clientInfo.id] = new Client(socket,clientInfo);
        // if the name is not unique, make it unique
        this.clients[clientInfo.id].displayName = this.getAlternativeNameIfOccupied(this.clients[clientInfo.id].displayName);
        this.assignedNames[this.clients[clientInfo.id].displayName.toLowerCase()] = clientInfo.id;
    }

    doesClientExist(id){
        return (id && this.clients[id]);
    }

    verificateClient(socket,id,token){
        return token && this.clients[id].verification === token && socket.clientId === id;
    }

    isClientReady(id){
        return  this.clients[id].playerIndex >=0 && this.clients[id].color >=0;
    }

    /**
     * @param id
     * @returns {Client} the client instance corresponding to the id
     */
    getClient(id){
        if(!id){
            console.warn("id does not exist");
            return null;
        }
        return this.clients[id];
    }

    /**
     * updates the color of an client
     * @param id
     * @param color
     * @returns {string}
     */
    updateClientColor(id,color){
        if(!this.doesClientExist(id)){
            console.log("client",id,"does not exist");
            return "client_does_not_exist";
        }

        let c =Util.parseColor(color);

        if(this.assignedColors[c]){
            console.log("color",c,"already chosen by",this.assignedColors[c],"cannot be chosen from",id);
            return "color_already_chosen";
        }

        console.log("updated client",id," color:",color);

        // release old color
        let oldColor = this.getClient(id).color;
        if(oldColor >=0){
            delete this.assignedColors[oldColor];
        }

        this.clients[id].color = c;
        this.assignedColors[c] = id;
        return "";
    }

    /**
     * updates the playerindex of a client (aka the seat)
     * @param id
     * @param index
     * @returns {string} reson of rejection
     */
    updateClientIndex(id,index){
        if(!this.doesClientExist(id)){
            console.log("updateClientIndex: client",id,"does not exist");
            return "client_does_not_exist";
        }

        if(index >=Ticks.MAX_PLAYERS){
            console.log("updateClientIndex: client",id,"wants an index which is higher than the maximum player count",index);
            return "player_index_out_of_range";
        }

        if(this.assignedPlayerIndexes[index]){
            console.log("updateClientIndex: seat",index,"already chosen by",this.assignedPlayerIndexes[index],"cannot be chosen from",id);
            return "seat_already_occupied";
        }

        // release old index
        let oldIndex = this.getClient(id).playerIndex;
        if(oldIndex >=0){
            this.assignedPlayerIndexes[oldIndex]=false;
        }

        console.log("updated client",id,"player index index:",index);
        this.clients[id].playerIndex = index;
        this.assignedPlayerIndexes[index] = id; // seat is now taken
        return "";
    }


    /**
     * changes the clients name
     * @param id
     * @param name
     * @returns {string}
     */
    updateClientName(id,name){
        if(!this.doesClientExist(id)){
            console.log("updateClientIndex: client",id,"does not exist");
            return "client_does_not_exist";
        }

        if(!name){
            console.log("updateClientIndex: client",id," cannot have an empty name");
            return "no_name";
        }
        name = name.toString();
        // check just consists letters and digits
        if(!/^\w+$/.test(name)){
            return "incorrect_name_characters";
        }

        name = name || "";
        name = name.trim();

        // checkif name has correct langth
        if(!name
            || name.length <SharedConfig.MIN_NAME_LENGTH
            || name.length > SharedConfig.MAX_NAME_LENGTH
        ){
            return "incorrect_name_length";
        }


        if(this.assignedNames[name]){
            return "name_already_occupied";
        }

        let curClient = this.getClient(id);
        let old = curClient.name;

        if(old === name){
            console.log("updateClientName: no change, now name equals old name");
            return "";
        }
        if(this.badWordsFilter.isProfane(name)){
            console.log("updateClientName: ",id," tried to chose a profane name");
            return "chosen_name_is_forbidden";
        }
        old = old.toLowerCase();
        // release old name TODO: evtl drin lassn?
        if(this.assignedNames[old]){
            delete this.assignedNames[old];
            this.assignedNames[name.toLowerCase()] = curClient.id;
        }

        console.log("updateClientName: player",id,"changed name from",old,"to",name);

        return "";
    }

    /**
     * returns all public info about all clients.
     * used to collect all info about players, when a new client connetcs
     * @param except = usually, this is the newly connected sender.
     * @returns {Array} info about all already connected clients
     */
    getAllPublicClientInfo(except){
        let result = [];
        for(let key in this.clients){
            if(!this.clients.hasOwnProperty(key) || (except && key === except)) continue;
            result.push(this.clients[key].publicInfo);
        }
        return result;
    }

    /**
     * checks if the client is an admin
     * @param id of the client
     * @param vertification hash of the client
     * @returns {boolean} true, if the client is the admin
     */
    isAdmin(id){
        if(!id){
            console.warn("id does not exist");
            return false;
        }
        return this.admin === id; // && this.clients[id].vertification == vertification;
    }

    clientConnected(socket,clientInfo){
        this._addClient(socket,clientInfo);

        this._currentConnectionCount = Object.keys(this.clients).length;
        console.log("Connected: "+clientInfo.id+" Users: "+this._currentConnectionCount);

        if(this.admin == null){
            this.admin = clientInfo.id;
            console.log("Admin is now: "+this.admin);
        }
    }

    clientDisconnected(socket,data){
        //this.boradcastExceptSender(clientSocket,Packages.PROTOCOL.SERVER.CLIENT_DISCONNECTED,{msg:"",data:{id:clientSocket.id}});

        if (this.clients.hasOwnProperty(socket.clientId)) {
            this.assignedPlayerIndexes[this.clients[socket.clientId].playerIndex] = false;   // free the seat
            delete this.assignedColors[this.clients[socket.clientId].color];  // release color
            delete this.assignedNames[this.clients[socket.clientId].displayName];
            delete this.clients[socket.clientId];                             // remove client out of the list
        }

        this._currentConnectionCount = Object.keys(this.clients).length;
        console.log("disconnect: "+socket.clientId+" Users left: "+this._currentConnectionCount);
        // change addmin
        if(this.admin === socket.clientId){
            this.admin = null;
            let keys = Object.keys(this.clients);
            if(keys.length > 0) {
                this.admin = keys[0];
                //   this._sendToClient(this.connections[this.admin].socket,Statics.PROTOCOL.CLIENT.USERINFO,{admin:true});
                console.log("Admin is now: "+this.admin);
            }
        }
    }

    // -------------- updates---------
    /**
     * checks if the passed name is already occupied, if yes, create a new name
     * with just breakets and a number in them, e.g. mick (1)
     * @param name
     * @param i
     * @returns {string} the uniq name
     */
    getAlternativeNameIfOccupied(name){
        let result = name;
        let i=1;
        while(this.assignedNames[result.toLowerCase()]){
            result = name+" ("+i+")";
            i++;
        }
        return result;
    }

    /**
     * get a random name. If the name is already assigned, take another one
     * @returns {*}
     */
    getRandomName(i=0){
        let result = RANDOM_NAMES[Math.floor(Math.random()*RANDOM_NAMES.length)];

        if(i>5){    // if it is called mare then 5 times recursively, then combine two random names
            result = ADJECTIVES[Math.floor(Math.random()*RANDOM_NAMES.length)]+"-"+RANDOM_NAMES[Math.floor(Math.random()*RANDOM_NAMES.length)];
        }else if(i>10){
            return this.getAlternativeNameIfOccupied(result);
        }

        if(this.assignedNames[result.toLowerCase()]){
            i++;
            return this.getRandomName(i);
        }
        return result;
    }
}

module.exports =  ClientManager;