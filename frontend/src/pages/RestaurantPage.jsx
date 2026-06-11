import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axios.js";
import { useCart } from "../context/CartContext.jsx";
import "./RestaurantPage.css";

export default function RestaurantPage() {
  const { id } = useParams();
  const [data, setData] = useState(null); //{restaurant, menu}
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const { addToCart, cart } = useCart();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await axios.get(`/restaurants/${id}`);
        setData(res.data);

        //Set first category as active tab by default
        const firstCat = Object.keys(res.data.menu)[0];
        if (firstCat) setActiveCategory(firstCat);
      } catch (error) {
        console.error("Failed to fetch restaurant:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }
  if (!data) {
    return <div className="loading-message">Restaurant not found</div>;
  }

  const { restaurant, menu } = data;
  const categories = Object.keys(menu);

  //How many items from THIS restaurant are in the cart
  const cartCount =
    cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="restaurant-page">
      {/* Restaurant Header */}
      <div className="restaurant-header">
        {restaurant.image && (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="restaurant-banner"
          />
        )}

        <div className="restaurant-header-content">
          <div className="restaurant-top-section">
            <div>
              <h1 className="restaurant-title">{restaurant.name}</h1>

              <p className="restaurant-cuisine">
                {restaurant.cuisine
                  .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
                  .join(", ")}
              </p>

              {restaurant.description && (
                <p className="restaurant-description">
                  {restaurant.description}
                </p>
              )}
            </div>

            <div className="restaurant-rating-section">
              <div className="restaurant-rating">
                ⭐{" "}
                {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "New"}
              </div>

              <div className="restaurant-total-ratings">
                {restaurant.totalRatings} ratings
              </div>
            </div>
          </div>

          {/* Info chips */}
          <div className="restaurant-info-row">
            <span>🕐 {restaurant.deliveryTime} mins</span>

            {restaurant.minimumOrder > 0 && (
              <span>🛒 Min order ₹{restaurant.minimumOrder}</span>
            )}

            <span>📍 {restaurant.address.city}</span>

            <span
              className={`restaurant-status ${
                restaurant.isOpen ? "open" : "closed"
              }`}
            >
              {restaurant.isOpen ? "● Open now" : "● Closed"}
            </span>
          </div>
        </div>
      </div>

      <div className="restaurant-layout">
        {/* Category Sidebar */}
        <div className="category-sidebar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`category-button ${
                activeCategory === cat ? "active" : ""
              }`}
            >
              {cat}

              <span className="category-count">{menu[cat].length}</span>
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div>
          <h2 className="category-title">{activeCategory}</h2>

          <div className="menu-items-list">
            {(menu[activeCategory] || []).map((item) => (
              <MenuItemCard
                key={item._id}
                item={item}
                onAdd={() => addToCart(item, restaurant)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div
          className="floating-cart-button"
          onClick={() => (window.location.href = "/cart")}
        >
          🛒 {cartCount} items · View Cart
        </div>
      )}
    </div>
  );
}

//Menu Item Card
function MenuItemCard({ item, onAdd }) {
  return (
    <div className="menu-item-card">
      <div className="menu-item-content">
        {/* Veg/Non-veg indicator */}
        <div className="menu-item-header">
          <div
            className={`food-indicator ${
              item.isVeg ? "veg-indicator" : "nonveg-indicator"
            }`}
          >
            <div
              className={`food-indicator-dot ${
                item.isVeg ? "veg-dot" : "nonveg-dot"
              }`}
            />
          </div>

          <span className="menu-item-name">{item.name}</span>
        </div>

        {item.description && (
          <p className="menu-item-description">{item.description}</p>
        )}

        <span className="menu-item-price">₹{item.price}</span>
      </div>

      {/* Item image + add button */}
      <div className="menu-item-image-section">
        <div className="menu-item-image-container">
          {item.image ? (
            <img src={item.image} alt={item.name} className="menu-item-image" />
          ) : (
            <div className="menu-item-placeholder">🍽️</div>
          )}
        </div>

        {/* ADD button sits below the image */}
        <button
          onClick={onAdd}
          disabled={!item.isAvailable}
          className="add-button"
        >
          {item.isAvailable ? "ADD" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
