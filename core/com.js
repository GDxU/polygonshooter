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
        GAME: {
            MINIGOLF: "/game"
        },
        LOBBY:"/lobby"
    },
    PROTOCOL: {
        GENERAL:{
            TO_CLIENT:{
                ERROR:"ERROR",
                RESPONSE_CLIENT_ACCEPTED: "RESPONSE_CLIENT_ACCEPTED",
                INIT_DATA: "INIT_GAME",
                UPDATE_STATE: "UPDATE_STATE",
                CLIENT_CONNECTED: "CLIENT_CONNECTED",
                CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",
                CLIENT_VALUE_UPDATE: "CLIENT_VALUE_UPDATE",
                CLIENT_VALUE_UPDATE_REJECTED: "CLIENT_VALUE_UPDATE_REJECTED"
            },
            TO_SERVER:{
                ERROR:"ERROR",
                SEND_STATE: "SEND_STATE",
                CLIENT_VALUE_UPDATE:"CLIENT_VALUE_UPDATE"
            }
        },
        GAME: {
            MINIGOLF: {
                TO_CLIENT: {
                    MAP: "MAP",

                },
                TO_SERVER: {
                }
            }
        },
        MODULES:{
            CHAT:{
                TO_CLIENT: {
                    CHAT_MSG:"CHAT_MSG"
                },
                TO_SERVER: {
                    CHAT_MSG:"CHAT_MSG"
                }
            }
        }
    }
};