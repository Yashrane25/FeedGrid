import { useState } from "react";

const RestaurantForm = ({
  initialData = null,
  onSubmit,
  isLoading = false,
  submitLabel = "Submit",
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    cuisineType: initialData?.cuisineType?.join(", ") || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    street: initialData?.address?.street || "",
    city: initialData?.address?.city || "",
    state: initialData?.address?.state || "",
    pincode: initialData?.address?.pincode || "",
    deliveryTime: initialData?.deliveryTime || 30,
    minimumOrder: initialData?.minimumOrder || 0,
    deliveryFee: initialData?.deliveryFee || 0,
    openingHoursOpen: initialData?.openingHours?.open || "09:00",
    openingHoursClose: initialData?.openingHours?.close || "23:00",
    longitude: initialData?.location?.coordinates?.[0] || "",
    latitude: initialData?.location?.coordinates?.[1] || "",
  });

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      return setError("Restaurant name is required");
    }

    if (!formData.cuisineType.trim()) {
      return setError("At least one cuisine type is required");
    }

    if (!formData.phone.trim()) {
      return setError("Phone number is required");
    }

    if (
      !formData.street.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      return setError("Please fill in the complete address");
    }

    const cuisineArray = formData.cuisineType
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      cuisineType: cuisineArray,
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      },
      deliveryTime: Number(formData.deliveryTime),
      minimumOrder: Number(formData.minimumOrder),
      deliveryFee: Number(formData.deliveryFee),
      openingHours: {
        open: formData.openingHoursOpen,
        close: formData.openingHoursClose,
      },
    };

    if (formData.longitude && formData.latitude) {
      payload.location = {
        longitude: parseFloat(formData.longitude),
        latitude: parseFloat(formData.latitude),
      };
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <form className="restaurant-form" onSubmit={handleSubmit}>
      {error && <div className="restaurant-form-error">{error}</div>}

      {/* Basic Information */}
      <div className="restaurant-form-section">
        <div className="restaurant-form-section-title">Basic Information</div>

        <div className="restaurant-form-group">
          <label className="restaurant-form-label">
            Restaurant Name <span className="restaurant-form-required">*</span>
          </label>
          <input
            className="restaurant-form-input"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. FeedGrids's Kitchen"
            disabled={isLoading}
          />
        </div>

        <div className="restaurant-form-group">
          <label className="restaurant-form-label">Description</label>
          <textarea
            className="restaurant-form-textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell customers what makes your restaurant special..."
            disabled={isLoading}
          />
        </div>

        <div className="restaurant-form-group">
          <label className="restaurant-form-label">
            Cuisine Types <span className="restaurant-form-required">*</span>
          </label>
          <input
            className="restaurant-form-input"
            type="text"
            name="cuisineType"
            value={formData.cuisineType}
            onChange={handleChange}
            placeholder="e.g. Indian, Chinese, Fast Food"
            disabled={isLoading}
          />
          <div className="restaurant-form-hint">
            Separate multiple cuisines with commas
          </div>
        </div>

        <div className="restaurant-form-row">
          <div className="restaurant-form-group">
            <label className="restaurant-form-label">
              Phone <span className="restaurant-form-required">*</span>
            </label>
            <input
              className="restaurant-form-input"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit number"
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Email</label>
            <input
              className="restaurant-form-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="restaurant@email.com"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="restaurant-form-section">
        <div className="restaurant-form-section-title">Address</div>

        <div className="restaurant-form-group">
          <label className="restaurant-form-label">
            Street Address <span className="restaurant-form-required">*</span>
          </label>
          <input
            className="restaurant-form-input"
            type="text"
            name="street"
            value={formData.street}
            onChange={handleChange}
            placeholder="Shop no., Building, Street name"
            disabled={isLoading}
          />
        </div>

        <div className="restaurant-form-row">
          <div className="restaurant-form-group">
            <label className="restaurant-form-label">
              City <span className="restaurant-form-required">*</span>
            </label>
            <input
              className="restaurant-form-input"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">
              State <span className="restaurant-form-required">*</span>
            </label>
            <input
              className="restaurant-form-input"
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="restaurant-form-group">
          <label className="restaurant-form-label">
            Pincode <span className="restaurant-form-required">*</span>
          </label>
          <input
            className="restaurant-form-input"
            type="text"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="6-digit pincode"
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        <div className="restaurant-form-row">
          <div className="restaurant-form-group">
            <label className="restaurant-form-label">
              Longitude (optional)
            </label>
            <input
              className="restaurant-form-input"
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="e.g. 72.5714"
              step="any"
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Latitude (optional)</label>
            <input
              className="restaurant-form-input"
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="e.g. 23.0225"
              step="any"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="restaurant-form-hint">
          💡 Find coordinates at{" "}
          <a
            href="https://www.latlong.net"
            target="_blank"
            rel="noreferrer"
            className="restaurant-form-link"
          >
            latlong.net
          </a>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="restaurant-form-section">
        <div className="restaurant-form-section-title">Delivery Settings</div>

        <div className="restaurant-form-row-3">
          <div className="restaurant-form-group">
            <label className="restaurant-form-label">
              Delivery Time (mins)
            </label>
            <input
              className="restaurant-form-input"
              type="number"
              name="deliveryTime"
              value={formData.deliveryTime}
              onChange={handleChange}
              min={5}
              max={120}
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Min Order (₹)</label>
            <input
              className="restaurant-form-input"
              type="number"
              name="minimumOrder"
              value={formData.minimumOrder}
              onChange={handleChange}
              min={0}
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Delivery Fee (₹)</label>
            <input
              className="restaurant-form-input"
              type="number"
              name="deliveryFee"
              value={formData.deliveryFee}
              onChange={handleChange}
              min={0}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="restaurant-form-row">
          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Opening Time</label>
            <input
              className="restaurant-form-input"
              type="time"
              name="openingHoursOpen"
              value={formData.openingHoursOpen}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="restaurant-form-group">
            <label className="restaurant-form-label">Closing Time</label>
            <input
              className="restaurant-form-input"
              type="time"
              name="openingHoursClose"
              value={formData.openingHoursClose}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={`restaurant-form-submit-btn ${
          isLoading ? "restaurant-form-submit-btn-disabled" : ""
        }`}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
};

export default RestaurantForm;
