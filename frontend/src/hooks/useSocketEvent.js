import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";

//Subscribes to a socket event and automatically cleans up
const useSocketEvent = (eventName, handler) => {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) {
            return;
        }

        //Subscribe to the event
        socket.on(eventName, handler);

        //Cleanup - unsubscribe when component unmounts or
        return () => {
            socket.off(eventName, handler);
        };
    }, [socket, eventName, handler]);
};

export default useSocketEvent;