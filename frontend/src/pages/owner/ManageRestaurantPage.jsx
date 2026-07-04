import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import RestaurantForm from "../../components/RestaurantForm";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./ManageRestaurantPage.css";

const ManageRestaurantPage = () => {
  const { restaurantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || null,
  );
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    isVegetarian: false,
    isVegan: false,
    preparationTime: 15,
    spiceLevel: "",
    tags: "",
  });

  const [menuFormError, setMenuFormError] = useState(null);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [restaurantRes, menuRes] = await Promise.all([
        API.get(`/restaurants/${restaurantId}`),
        API.get(`/restaurants/${restaurantId}/menu?available=all`),
      ]);

      setRestaurant(restaurantRes.data.restaurant);
      setMenuItems(menuRes.data.menuItems || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("You do not have permission to manage this restaurant");
      } else {
        setError(err.response?.data?.message || "Failed to load restaurant");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleUpdateRestaurant = async (formData) => {
    setIsSaving(true);

    try {
      const res = await API.put(`/restaurants/${restaurantId}`, formData);

      setRestaurant(res.data.restaurant);
      setSuccessMessage("Restaurant details updated successfully!");

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const openMenuForm = (item = null) => {
    if (item) {
      setEditingItem(item);

      setMenuForm({
        name: item.name,
        description: item.description || "",
        price: item.price,
        category: item.category,
        isVegetarian: item.isVegetarian,
        isNonVeg: item.isNonVeg,
        isVegan: item.isVegan,
        preparationTime: item.preparationTime,
        spiceLevel: item.spiceLevel || "",
        tags: item.tags?.join(", ") || "",
      });
    } else {
      setEditingItem(null);

      setMenuForm({
        name: "",
        description: "",
        price: "",
        category: "",
        isVegetarian: false,
        isNonVeg: false,
        isVegan: false,
        preparationTime: 15,
        spiceLevel: "",
        tags: "",
      });
    }

    setMenuFormError(null);
    setShowMenuForm(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();

    setMenuFormError(null);

    if (!menuForm.name.trim() || !menuForm.price || !menuForm.category.trim()) {
      return setMenuFormError("Name, price, and category are required");
    }

    const payload = {
      name: menuForm.name.trim(),
      description: menuForm.description.trim() || null,
      price: Number(menuForm.price),
      category: menuForm.category.trim(),
      isVegetarian: menuForm.isVegetarian,
      isNonVeg: menuForm.isNonVeg,
      isVegan: menuForm.isVegan,
      preparationTime: Number(menuForm.preparationTime),
      spiceLevel: menuForm.spiceLevel || null,
      tags: menuForm.tags
        ? menuForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    setIsSavingMenu(true);

    try {
      if (editingItem) {
        await API.put(
          `/restaurants/${restaurantId}/menu/${editingItem._id}`,
          payload,
        );
      } else {
        await API.post(`/restaurants/${restaurantId}/menu`, payload);
      }

      const menuRes = await API.get(
        `/restaurants/${restaurantId}/menu?available=all`,
      );

      setMenuItems(menuRes.data.menuItems || []);
      setShowMenuForm(false);
      setEditingItem(null);
    } catch (err) {
      setMenuFormError(
        err.response?.data?.message || "Failed to save menu item",
      );
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    setTogglingItemId(itemId);

    try {
      const res = await API.patch(
        `/restaurants/${restaurantId}/menu/${itemId}/toggle`,
      );

      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === itemId
            ? {
                ...item,
                isAvailable: res.data.isAvailable,
              }
            : item,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Delete "${itemName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await API.delete(`/restaurants/${restaurantId}/menu/${itemId}`);

      setMenuItems((prev) => prev.filter((item) => item._id !== itemId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete item");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading restaurant..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!restaurant) {
    return null;
  }

  return (
    <div className="manage-restaurant-page">
      <div className="breadcrumb" onClick={() => navigate("/owner/dashboard")}>
        ← My Restaurants
      </div>

      <div className="restaurant-header">
        <div className="restaurant-title-row">
          <h1 className="restaurant-title">{restaurant.name}</h1>

          <div className="badge-row">
            <span
              className={`status-badge ${
                restaurant.isApproved ? "approved-badge" : "pending-badge"
              }`}
            >
              {restaurant.isApproved ? "✓ Approved" : "⏳ Pending"}
            </span>

            <span
              className={`status-badge ${
                restaurant.isOpen ? "open-badge" : "closed-badge"
              }`}
            >
              {restaurant.isOpen ? "● Open" : "● Closed"}
            </span>
          </div>
        </div>
      </div>

      {successMessage && <div className="success-box">✓ {successMessage}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "details" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Restaurant Details
        </button>

        <button
          className={`tab ${activeTab === "menu" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("menu")}
        >
          Menu Items ({menuItems.length})
        </button>
      </div>

      {activeTab === "details" && (
        <RestaurantForm
          initialData={restaurant}
          onSubmit={handleUpdateRestaurant}
          isLoading={isSaving}
          submitLabel="Save Changes"
        />
      )}

      {activeTab === "menu" && (
        <div>
          <div className="menu-header">
            <span className="menu-heading">Menu Items</span>

            <button className="add-item-btn" onClick={() => openMenuForm()}>
              + Add Item
            </button>
          </div>
          {menuItems.length === 0 ? (
            <div className="empty-menu">
              <div className="empty-menu-icon">🍽️</div>

              <p className="empty-menu-text">No menu items yet</p>

              <button className="add-item-btn" onClick={() => openMenuForm()}>
                Add Your First Item
              </button>
            </div>
          ) : (
            <div className="menu-table">
              <div className="table-header">
                <span>Item</span>
                <span>Price</span>
                <span>Category</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {menuItems.map((item) => (
                <div key={item._id} className="table-row">
                  <div>
                    <div className="item-name">
                      <span
                        className={`veg-indicator ${
                          item.isVegetarian ? "veg" : "non-veg"
                        }`}
                      >
                        ●
                      </span>

                      {item.name}
                    </div>

                    <div className="item-category">{item.category}</div>
                  </div>

                  <div className="item-price">₹{item.price}</div>

                  <div className="item-category-column">{item.category}</div>

                  <div>
                    <span
                      className={`availability-badge ${
                        item.isAvailable ? "available" : "hidden"
                      }`}
                    >
                      {item.isAvailable ? "Available" : "Hidden"}
                    </span>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => openMenuForm(item)}
                    >
                      Edit
                    </button>

                    <button
                      className={`toggle-item-btn ${
                        item.isAvailable ? "hide-btn" : "show-btn"
                      }`}
                      onClick={() => handleToggleItem(item._id)}
                      disabled={togglingItemId === item._id}
                    >
                      {togglingItemId === item._id
                        ? "..."
                        : item.isAvailable
                          ? "Hide"
                          : "Show"}
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteItem(item._id, item.name)}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showMenuForm && (
        <div className="modal-overlay">
          <div className="menu-modal">
            <div className="modal-title">
              {editingItem ? `Edit: ${editingItem.name}` : "Add Menu Item"}
            </div>

            {menuFormError && (
              <div className="menu-form-error">{menuFormError}</div>
            )}

            <form onSubmit={handleSaveMenuItem}>
              <div className="form-group">
                <label className="form-label">Name *</label>

                <input
                  className="form-input"
                  type="text"
                  value={menuForm.name}
                  onChange={(e) =>
                    setMenuForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Butter Chicken"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>

                <input
                  className="form-input"
                  type="text"
                  value={menuForm.description}
                  onChange={(e) =>
                    setMenuForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of the item"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>

                  <input
                    className="form-input"
                    type="number"
                    value={menuForm.price}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="e.g. 320"
                    min={1}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>

                  <input
                    className="form-input"
                    type="text"
                    value={menuForm.category}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="e.g. Main Course"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prep Time (mins)</label>

                  <input
                    className="form-input"
                    type="number"
                    value={menuForm.preparationTime}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        preparationTime: e.target.value,
                      }))
                    }
                    min={1}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Spice Level</label>

                  <select
                    className="form-input"
                    value={menuForm.spiceLevel}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        spiceLevel: e.target.value,
                      }))
                    }
                  >
                    <option value="">None</option>
                    <option value="mild">Mild</option>
                    <option value="medium">Medium</option>
                    <option value="hot">Hot</option>
                    <option value="extra_hot">Extra Hot</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>

                <input
                  className="form-input"
                  type="text"
                  value={menuForm.tags}
                  onChange={(e) =>
                    setMenuForm((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="e.g. bestseller, recommended"
                />
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuForm.isVegetarian}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        isVegetarian: e.target.checked,
                      }))
                    }
                  />
                  Vegetarian
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuForm.isNonVeg}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        isNonVeg: e.target.checked,
                      }))
                    }
                  />
                  Non Vegetarian
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuForm.isVegan}
                    onChange={(e) =>
                      setMenuForm((prev) => ({
                        ...prev,
                        isVegan: e.target.checked,
                      }))
                    }
                  />
                  Vegan
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowMenuForm(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`save-btn ${
                    isSavingMenu ? "save-btn-disabled" : ""
                  }`}
                  disabled={isSavingMenu}
                >
                  {isSavingMenu
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRestaurantPage;
