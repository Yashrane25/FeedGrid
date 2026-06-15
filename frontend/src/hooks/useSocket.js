import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";

let socketInstance = null;

export const useSocket = () => {
    const { accessToken } = useAuth();
    const socketRef = useRef(null);

    useEffect(() => {
        if (socketInstance && socketInstance.connected) {
            socketRef.current = socketInstance;
            return;
        }

        //Create the Socket.io connection
        socketInstance = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
            auth: {
                token: accessToken ? `Bearer ${accessToken}` : null,
            },
            transports: ["websocket"],
        });

        socketRef.current = socketInstance;

        socketInstance.on("connect", () => {
            console.log("Socket connected:", socketInstance.id);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        socketInstance.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
        });

        //Cleanup: disconnect only when the entire app unmounts 
        return () => {
            //Dont disconnect here the hook may rerun on rerender Socket persists for the app lifetime
        };
    }, [accessToken]);

    return socketRef.current || socketInstance;
};