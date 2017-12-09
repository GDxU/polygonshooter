/**
 * Created by Mick on 22.05.2017.
 */
'use strict';

module.exports =
{
    createEvent: function (senderID, payload, token) {
        if (!payload)
            console.warn("sending event to ", id, " without data");
        let result = {
            senderID: senderID,
            payload: payload || {},
            timeStamp: new Date().getTime()
        };
        if (token) result.token = token;
        return result;
    },
    NAMESPACES:{
        MINIGOLF: "/game",
        LOBBY:"/lobby"
    },
    PROTOCOL: {
        GENERAL:{
            TO_CLIENT:{
                ERROR:"ERROR",
                RESPONSE_CLIENT_ACCEPTED: "RESPONSE_CLIENT_ACCEPTED",
                INIT_DATA: "INIT_GAME",

                UPDATE_STATE: "UPDATE_STATE",
                UPDATE_STATE_REJECTED: "UPDATE_STATE_REJECTED",

                CLIENT_CONNECTED: "CLIENT_CONNECTED",
                CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",

                CLIENT_VALUE_UPDATE: "CLIENT_VALUE_UPDATE",
                CLIENT_VALUE_UPDATE_REJECTED: "CLIENT_VALUE_UPDATE_REJECTED",
            },
            TO_SERVER:{
                ERROR:"ERROR",
                SEND_STATE: "SEND_STATE",

                CLIENT_VALUE_UPDATE:"CLIENT_VALUE_UPDATE"
            },
            ERRORS:{
                NO_FREE_SLOT_AVAILABLE_ON_SERVER:"NO_FREE_SLOT_AVAILABLE_ON_SERVER"
            },
            CLIENT_VALUES:{
                COLOR:"COLOR",
                PLAYER_INDEX:"PLAYER_INDEX",
                NAME:"NAME"
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
            },
            MINIGOLF: {
                MODULE_NAME:"MINIGOLF",
                TO_CLIENT: {
                    MAP: "MAP",
                    ENTITY_ADDED:"ENTITY_ADDED"
                },
                TO_SERVER: {
                }
            },
            ERRORS:{
                MAP_DOES_NOT_EXIST:"MAP_DOES_NOT_EXIST"
            }
        }
    }
};