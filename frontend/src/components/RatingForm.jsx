import { useState } from "react";
import StarRating from "./StarRating";
import { rateOrder } from "../services/orderService";
import "./RatingForm.css";

const RatingForm = ({ orderId, restaurantName, onSuccess }) => {
  const [score, setScore] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (score === 0) {
      return setError("Please select a star rating");
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await rateOrder(orderId, score, review);
      onSuccess && onSuccess(data.rating);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rating-form">
      <div className="rating-form__header">
        <div className="rating-form__icon">⭐</div>
        <div>
          <div className="rating-form__title">Rate your experience</div>
          <div className="rating-form__subtitle">
            How was your order from <strong>{restaurantName}</strong>?
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Star selector */}
        <div className="rating-form__stars-section">
          <StarRating value={score} onChange={setScore} size="lg" />
        </div>

        {/* Review text */}
        <div className="rating-form__review-section">
          <label className="rating-form__label">
            Write a review{" "}
            <span className="rating-form__optional">(optional)</span>
          </label>
          <textarea
            className="rating-form__textarea"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="How was the food? Was it delivered on time?"
            rows={3}
            maxLength={300}
            disabled={isSubmitting}
          />
          <div className="rating-form__char-count">{review.length}/300</div>
        </div>

        {error && <div className="rating-form__error">{error}</div>}

        <button
          type="submit"
          className={`rating-form__submit ${
            isSubmitting ? "rating-form__submit--loading" : ""
          }`}
          disabled={isSubmitting || score === 0}
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </button>
      </form>
    </div>
  );
};

export default RatingForm;
