import "./LoadingSpinner.css";

// Simple full-page loading indicator used while API calls are in progress
const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__circle"></div>

      <p className="loading-spinner__message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
