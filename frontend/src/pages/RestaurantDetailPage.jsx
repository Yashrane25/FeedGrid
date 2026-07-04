import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantById } from "../services/restaurantService";
import MenuItemCard from "../components/MenuItemCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ClearCartDialog from "../components/ClearCartDialog";
import { useCart } from "../context/CartContext";
import ReviewsSection from "../components/ReviewsSection";
import "./RestaurantDetailPage.css";

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, confirmClearAndAdd, setIsCartOpen } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  const [clearCartDialog, setClearCartDialog] = useState({
    isOpen: false,
    message: "",
    newItem: null,
    newRestaurant: null,
  });

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getRestaurantById(id);

        setRestaurant(data.restaurant);
        setMenu(data.menu || {});

        const cats = Object.keys(data.menu || {}).sort();

        setCategories(cats);

        if (cats.length > 0) {
          setActiveCategory(cats[0]);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Restaurant not found");
        } else {
          setError(err.response?.data?.message || "Failed to load restaurant");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const handleAddToCart = (item) => {
    const result = addItem(item, {
      _id: restaurant._id,
      name: restaurant.name,
      deliveryFee: restaurant.deliveryFee,
    });

    if (result.requiresConfirmation) {
      setClearCartDialog({
        isOpen: true,
        message: result.message,
        newItem: result.newItem,
        newRestaurant: result.newRestaurant,
      });
      return;
    }

    if (result.success) {
      setIsCartOpen(true);
    }
  };

  const handleConfirmClear = () => {
    confirmClearAndAdd(clearCartDialog.newItem, clearCartDialog.newRestaurant);

    setClearCartDialog({
      isOpen: false,
      message: "",
      newItem: null,
      newRestaurant: null,
    });

    setIsCartOpen(true);
  };

  const handleCancelClear = () => {
    setClearCartDialog({
      isOpen: false,
      message: "",
      newItem: null,
      newRestaurant: null,
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading restaurant..." />;
  }

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={() => navigate("/restaurants")} />
    );
  }

  if (!restaurant) return null;

  const displayedItems = activeCategory
    ? menu[activeCategory] || []
    : Object.values(menu).flat();

  return (
    <div className="restaurant-detail-page">
      <ClearCartDialog
        isOpen={clearCartDialog.isOpen}
        message={clearCartDialog.message}
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      <button
        className="restaurant-detail-page__back-button"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {restaurant.images && restaurant.images.length > 0 ? (
        <img
          src={restaurant.images[0]}
          alt={restaurant.name}
          className="restaurant-detail-page__hero-image"
        />
      ) : (
        <div className="restaurant-detail-page__hero-placeholder">🍽️</div>
      )}

      <div className="restaurant-detail-page__info-section">
        <div className="restaurant-detail-page__name-row">
          <h1 className="restaurant-detail-page__name">{restaurant.name}</h1>

          <span
            className={`restaurant-detail-page__status-badge ${
              restaurant.isOpen
                ? "restaurant-detail-page__status-badge--open"
                : "restaurant-detail-page__status-badge--closed"
            }`}
          >
            {restaurant.isOpen ? "● Open" : "● Closed"}
          </span>
        </div>

        <p className="restaurant-detail-page__cuisine">
          {restaurant.cuisineType?.join(" • ")}
        </p>

        {restaurant.description && (
          <p className="restaurant-detail-page__description">
            {restaurant.description}
          </p>
        )}

        <div className="restaurant-detail-page__meta-row">
          <span className="restaurant-detail-page__meta-item">
            ★{" "}
            <strong>
              {restaurant.averageRating > 0
                ? restaurant.averageRating.toFixed(1)
                : "New"}
            </strong>
            {restaurant.totalRatings > 0 && (
              <span className="restaurant-detail-page__rating-count">
                ({restaurant.totalRatings} ratings)
              </span>
            )}
          </span>

          <span className="restaurant-detail-page__meta-item">
            🕐 <strong>{restaurant.deliveryTime} mins</strong>
          </span>

          <span className="restaurant-detail-page__meta-item">
            🛵{" "}
            <strong>
              {restaurant.deliveryFee === 0
                ? "Free delivery"
                : `₹${restaurant.deliveryFee}`}
            </strong>
          </span>

          {restaurant.minimumOrder > 0 && (
            <span className="restaurant-detail-page__meta-item">
              Min order:
              <strong>₹{restaurant.minimumOrder}</strong>
            </span>
          )}

          <span className="restaurant-detail-page__meta-item">
            📍 {restaurant.address?.city}
          </span>
        </div>
      </div>
      {categories.length > 0 && (
        <div className="restaurant-detail-page__tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={
                activeCategory === cat
                  ? "restaurant-detail-page__tab restaurant-detail-page__tab--active"
                  : "restaurant-detail-page__tab"
              }
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({menu[cat]?.length || 0})
            </button>
          ))}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="restaurant-detail-page__empty-menu">
          <div className="restaurant-detail-page__empty-icon">🍽️</div>

          <p>No menu items available yet</p>
        </div>
      ) : (
        <div className="restaurant-detail-page__menu-section">
          <div className="restaurant-detail-page__menu-title">
            {activeCategory || "All Items"} ({displayedItems.length})
          </div>

          {displayedItems.length === 0 ? (
            <div className="restaurant-detail-page__empty-menu">
              No items in this category
            </div>
          ) : (
            displayedItems.map((item) => (
              <MenuItemCard
                key={item._id}
                item={item}
                onAddToCart={handleAddToCart}
              />
            ))
          )}
        </div>
      )}

      {restaurant && (
        <ReviewsSection
          restaurantId={restaurant._id}
          averageRating={restaurant.averageRating}
          totalRatings={restaurant.totalRatings}
        />
      )}
    </div>
  );
};

export default RestaurantDetailPage;
