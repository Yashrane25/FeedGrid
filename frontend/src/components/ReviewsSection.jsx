import { useState, useEffect } from "react";
import StarRating from "./StarRating";
import { getRestaurantReviews } from "../services/restaurantService";
import "./ReviewsSection.css";

const DistributionBar = ({ star, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="dist-bar">
      <span className="dist-bar__label">{star}★</span>
      <div className="dist-bar__track">
        <div className="dist-bar__fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="dist-bar__count">{count}</span>
    </div>
  );
};

const ReviewsSection = ({
  restaurantId,
  averageRating = 0,
  totalRatings = 0,
}) => {
  const [reviews, setReviews] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const data = await getRestaurantReviews(restaurantId, {
          page,
          limit: 5,
        });
        setReviews(data.reviews || []);
        setDistribution(data.distribution || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [restaurantId, page]);

  const distMap = distribution.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return (
    <div className="reviews-section">
      <h3 className="reviews-section__title">Ratings &amp; Reviews</h3>

      {totalRatings === 0 ? (
        <div className="reviews-section__empty">
          <div className="reviews-section__empty-icon">⭐</div>
          <p className="reviews-section__empty-text">
            No reviews yet. Be the first to rate this restaurant!
          </p>
        </div>
      ) : (
        <>
          {/* Rating summary */}
          <div className="reviews-section__summary">
            <div className="reviews-section__average">
              <div className="reviews-section__average-number">
                {averageRating.toFixed(1)}
              </div>
              <StarRating
                value={Math.round(averageRating)}
                readonly
                size="sm"
              />
              <div className="reviews-section__total">
                {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
              </div>
            </div>

            {/* Distribution bars */}
            <div className="reviews-section__distribution">
              {[5, 4, 3, 2, 1].map((star) => (
                <DistributionBar
                  key={star}
                  star={star}
                  count={distMap[star] || 0}
                  total={totalRatings}
                />
              ))}
            </div>
          </div>

          {/* Individual reviews */}
          {loading ? (
            <div className="reviews-section__loading">Loading reviews...</div>
          ) : (
            <div className="reviews-section__list">
              {reviews.map((review) => (
                <div key={review._id} className="review-card">
                  <div className="review-card__header">
                    <div className="review-card__avatar">
                      {review.customer?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="review-card__meta">
                      <div className="review-card__name">
                        {review.customer?.name || "Customer"}
                      </div>
                      <div className="review-card__date">
                        {new Date(review.rating.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </div>
                    <div className="review-card__stars">
                      <StarRating
                        value={review.rating.score}
                        readonly
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Items ordered */}
                  <div className="review-card__items">
                    {review.items?.slice(0, 2).map((item, i) => (
                      <span key={i} className="review-card__item-tag">
                        {item.name}
                      </span>
                    ))}
                  </div>

                  {/* Review text */}
                  {review.rating.review && (
                    <p className="review-card__text">
                      "{review.rating.review}"
                    </p>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="reviews-section__pagination">
                  <button
                    className="reviews-section__page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </button>
                  <span className="reviews-section__page-info">
                    {page} / {totalPages}
                  </span>
                  <button
                    className="reviews-section__page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewsSection;
