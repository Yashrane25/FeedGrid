import { useState } from "react";
import "./StarRating.css";

const StarRating = ({ value = 0, onChange, readonly = false, size = "md" }) => {
  const [hovered, setHovered] = useState(0);

  const displayValue = hovered || value;

  const labels = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  return (
    <div className={`star-rating star-rating--${size}`}>
      <div className="star-rating__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-rating__star ${
              star <= displayValue
                ? "star-rating__star--filled"
                : "star-rating__star--empty"
            } ${readonly ? "star-rating__star--readonly" : ""}`}
            onClick={() => !readonly && onChange && onChange(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            disabled={readonly}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Show label only on interactive rating */}
      {!readonly && displayValue > 0 && (
        <span className="star-rating__label">{labels[displayValue]}</span>
      )}

      {/* Show numeric value in readonly mode */}
      {readonly && value > 0 && (
        <span className="star-rating__value">{value.toFixed(1)}</span>
      )}
    </div>
  );
};

export default StarRating;
