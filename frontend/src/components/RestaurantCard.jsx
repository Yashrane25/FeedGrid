import { Link } from "react-router-dom";
import "./RestaurantCard.css";

const RestaurantCard = ({ restaurant }) => {
  const {
    _id,
    name,
    cuisineType,
    images,
    averageRating,
    totalRatings,
    deliveryTime,
    deliveryFee,
    minimumOrder,
    isOpen,
    address,
  } = restaurant;

  return (
    //Link wraps the entire card clicking anywhere navigates to detail page
    <Link to={`/restaurants/${_id}`} className="restaurant-card">
      {/* Image */}
      <div className="restaurant-card__image-wrapper">
        {images && images.length > 0 ? (
          <img src={images[0]} alt={name} className="restaurant-card__image" />
        ) : (
          <div className="restaurant-card__image-placeholder">🍽️</div>
        )}

        {!isOpen && (
          <span className="restaurant-card__closed-badge">Closed</span>
        )}
      </div>

      {/* Card body */}
      <div className="restaurant-card__body">
        <div className="restaurant-card__name">{name}</div>

        <div className="restaurant-card__cuisine">
          {cuisineType?.join(" • ")}
        </div>

        {/* Rating */}
        <div className="restaurant-card__rating">
          <span className="restaurant-card__star">★</span>

          <span className="restaurant-card__rating-value">
            {averageRating > 0 ? averageRating.toFixed(1) : "New"}
          </span>

          {totalRatings > 0 && (
            <span className="restaurant-card__rating-count">
              ({totalRatings})
            </span>
          )}
        </div>

        {/* City */}
        {address?.city && (
          <div className="restaurant-card__city">📍 {address.city}</div>
        )}

        {/* Meta info */}
        <div className="restaurant-card__meta">
          <span className="restaurant-card__meta-item">
            🕐 {deliveryTime} mins
          </span>

          <span className="restaurant-card__meta-item">
            🛵{" "}
            {deliveryFee === 0 ? "Free delivery" : `₹${deliveryFee} delivery`}
          </span>

          {minimumOrder > 0 && (
            <span className="restaurant-card__meta-item">
              Min ₹{minimumOrder}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
