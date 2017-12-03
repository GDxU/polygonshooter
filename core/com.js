/**
 * Created by Mick on 22.05.2017.
 */
'use strict';

module.exports =
{
    createEvent: function (senderID, payload, token) {
        if (!payload)
            console.warn("sending event to ", id, " without data");
        var result = {
            senderID: senderID,
            payload: payload || {},
            timeStamp: new Date().getTime()
        };
        if (token) result.token = token;
        return result;
    },
    NAMESPACES:{
        GAME:"/game",
        LOBBY:"/lobby"
    },
    PROTOCOL: {
        GAME: {
            TO_CLIENT: {
                MAP: "MAP"
            },
            TO_SERVER: {}
        }
    }
};