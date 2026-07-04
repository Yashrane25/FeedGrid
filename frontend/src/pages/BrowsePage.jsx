import { useState, useEffect } from "react";
import useRestaurants from "../hooks/useRestaurants";
import useDebounce from "../hooks/useDebounce";
import RestaurantCard from "../components/RestaurantCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./BrowsePage.css";

//Cuisine options for the filter dropdown
const CUISINE_OPTIONS = [
  "All",
  "Indian",
  "Chinese",
  "Italian",
  "Mexican",
  "Fast Food",
  "Mughlai",
  "South Indian",
  "Continental",
  "Desserts",
];

const BrowsePage = () => {
  const {
    restaurants,
    loading,
    error,
    total,
    totalPages,
    filters,
    updateFilter,
    resetFilters,
    refetch,
  } = useRestaurants();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    updateFilter("search", debouncedSearch);
  }, [debouncedSearch, updateFilter]);

  return (
    <div className="browse-page">
      {/* Header */}
      <div className="browse-page__header">
        <h1 className="browse-page__title">Browse Restaurants</h1>

        <p className="browse-page__subtitle">
          Discover the best food around you
        </p>
      </div>

      {/* Filter Bar */}
      <div className="browse-page__filter-bar">
        {/* Search input with debouncing */}
        <input
          className="browse-page__search-input"
          type="text"
          placeholder="Search restaurants or cuisines..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        {/* City filter */}
        <input
          className="browse-page__city-input"
          type="text"
          placeholder="City..."
          value={filters.city}
          onChange={(e) => updateFilter("city", e.target.value)}
        />

        {/* Cuisine filter */}
        <select
          className="browse-page__select"
          value={filters.cuisine}
          onChange={(e) =>
            updateFilter(
              "cuisine",
              e.target.value === "All" ? "" : e.target.value,
            )
          }
        >
          {CUISINE_OPTIONS.map((c) => (
            <option key={c} value={c === "All" ? "" : c}>
              {c}
            </option>
          ))}
        </select>

        {/* Sort filter */}
        <select
          className="browse-page__select"
          value={filters.sort}
          onChange={(e) => updateFilter("sort", e.target.value)}
        >
          <option value="createdAt">Newest First</option>
          <option value="rating">Top Rated</option>
          <option value="deliveryTime">Fastest Delivery</option>
          <option value="deliveryFee">Lowest Delivery Fee</option>
        </select>

        {/* Reset button */}
        <button
          className="browse-page__reset-button"
          onClick={() => {
            resetFilters();
            setSearchInput("");
          }}
        >
          Reset
        </button>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="browse-page__results-info">
          {total === 0
            ? "No restaurants found"
            : `Showing ${restaurants.length} of ${total} restaurants`}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="Finding restaurants near you..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : restaurants.length === 0 ? (
        <div className="browse-page__empty-state">
          <div className="browse-page__empty-icon">🍽️</div>

          <h3>No restaurants found</h3>

          <p>Try adjusting your filters or search term</p>

          <button
            className="browse-page__clear-button"
            onClick={() => {
              resetFilters();
              setSearchInput("");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Restaurant Grid */}
          <div className="browse-page__grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="browse-page__pagination">
              <button
                className="browse-page__page-button"
                disabled={filters.page === 1}
                onClick={() => updateFilter("page", filters.page - 1)}
              >
                ← Prev
              </button>

              {/* Page number buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    className={
                      filters.page === pageNum
                        ? "browse-page__page-button browse-page__page-button--active"
                        : "browse-page__page-button"
                    }
                    onClick={() => updateFilter("page", pageNum)}
                  >
                    {pageNum}
                  </button>
                ),
              )}

              <button
                className="browse-page__page-button"
                disabled={filters.page === totalPages}
                onClick={() => updateFilter("page", filters.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowsePage;
