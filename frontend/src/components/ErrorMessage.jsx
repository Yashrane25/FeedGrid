import "./ErrorMessage.css";

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="error-message">
      <div className="error-message__icon">⚠️</div>

      <p className="error-message__text">{message}</p>

      {onRetry && (
        <button onClick={onRetry} className="error-message__button">
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
