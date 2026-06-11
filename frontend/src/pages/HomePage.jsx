import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios.js";
import "./HomePage.css";

export default function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  //Fetch restaurants whenever search, cuisine, sort, page changes
  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        //Build query string dynamically, only include params that have values
        const params = new URLSearchParams();
        if (search) {
          params.append("search", search);
        }
        if (cuisine) {
          params.append("cuisine", cuisine);
        }
        if (sort) {
          params.append("sort", sort);
        }
        params.append("page", page);
        params.append("limit", 12);

        const res = await axios.get(`/restaurants?${params}`);
        setRestaurants(res.data.restaurants);
        setPagination(res.data.pagination);
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    //Debounce the search, wait 400ms after user stops typing before making the API call
    const timer = setTimeout(fetchRestaurants, 400);
    return () => clearTimeout(timer);
  }, [search, cuisine, sort, page]);

  const cuisineOptions = [
    "All",
    "Indian",
    "Chinese",
    "Italian",
    "Pizza",
    "Burger",
    "Biryani",
    "South Indian",
  ];

  return (
    <div className="restaurant-container">
      {/* Search + Filter Bar */}
      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search restaurants or cuisines..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="search-input"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sort-select"
        >
          <option value="">Sort: Default</option>
          <option value="rating">Top Rated</option>
          <option value="deliveryTime">Fastest Delivery</option>
        </select>
      </div>

      {/* Cuisine Filter Pills */}
      <div className="cuisine-filter-container">
        {cuisineOptions.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCuisine(c === "All" ? "" : c.toLowerCase());
              setPage(1);
            }}
            className={`cuisine-pill ${
              cuisine === c.toLowerCase() || (c === "All" && !cuisine)
                ? "active"
                : ""
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="restaurant-grid">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="no-restaurants">
          <p className="no-restaurants-title">No restaurants found</p>
          <p>Try a different search or filter</p>
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map((r) => (
            <RestaurantCard key={r._id} restaurant={r} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`pagination-button ${page === p ? "active" : ""}`}
              >
                {p}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );

  //Restaurant Card Component
  function RestaurantCard({ restaurant }) {
    return (
      <Link
        to={`/restaurant/${restaurant._id}`}
        className="restaurant-card-link"
      >
        <div className="restaurant-card">
          {/* Restaurant image */}
          <div className="restaurant-image-container">
            {restaurant.image ? (
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="restaurant-image"
              />
            ) : (
              <div className="restaurant-image-placeholder">🍽️</div>
            )}
          </div>

          {/* Restaurant info */}
          <div className="restaurant-info">
            <div className="restaurant-header">
              <h3 className="restaurant-name">{restaurant.name}</h3>

              {!restaurant.isOpen && (
                <span className="closed-badge">Closed</span>
              )}
            </div>

            {/* Cuisines */}
            <p className="restaurant-cuisine">
              {restaurant.cuisine
                .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
                .join(" • ")}
            </p>

            {/* Stats row */}
            <div className="restaurant-stats">
              <span className="restaurant-rating">
                ⭐{" "}
                {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "New"}
              </span>

              <span className="restaurant-delivery">
                🕐 {restaurant.deliveryTime} min
              </span>

              {restaurant.minimumOrder > 0 && (
                <span className="restaurant-min-order">
                  Min ₹{restaurant.minimumOrder}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }
}
