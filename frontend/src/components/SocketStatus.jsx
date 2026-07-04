import { useSocket } from "../context/SocketContext";
import "./SocketStatus.css";

//Small dot indicator showing live connection status
const SocketStatus = () => {
  const { isConnected } = useSocket();

  return (
    <div
      className="socket-status"
      title={isConnected ? "Live updates connected" : "Reconnecting..."}
    >
      <span
        className={`socket-status-dot ${
          isConnected
            ? "socket-status-dot--connected"
            : "socket-status-dot--disconnected"
        }`}
      />
      <span className="socket-status-text">
        {isConnected ? "Live" : "Offline"}
      </span>
    </div>
  );
};

export default SocketStatus;
