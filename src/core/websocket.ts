import WebSocket from "ws";
import { URLSearchParams } from "url";

const BASE_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679";

export const createWebSocket = (chatroomId: number): WebSocket => {
    const urlParams = new URLSearchParams({
        protocol: "7",
        client: "js",
        version: "8.4.0",
        flash: "false",
    });
    const url = `${BASE_URL}?${urlParams.toString()}`;

    const socket = new WebSocket(url);

    socket.on("open", () => {
        const connect = JSON.stringify({
            event: "pusher:subscribe",
            data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
        });
        socket.send(connect);
    });

    return socket;
};
