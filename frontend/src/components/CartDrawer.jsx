import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./CartDrawer.css";

const CartDrawer = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const {
    items,
    cartRestaurant,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    tax,
    total,
    isEmpty,
  } = useCart();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setIsCartOpen(false);
      navigate("/login");
      return;
    }

    setIsCartOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-overlay ${isCartOpen ? "open" : ""}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className={`cart-drawer ${isCartOpen ? "open" : ""}`}>
        <div className="cart-header">
          <span className="cart-header-title">🛒 Your Cart</span>

          <button
            className="cart-close-button"
            onClick={() => setIsCartOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Restaurant Label */}
        {cartRestaurant && (
          <div className="cart-restaurant-label">
            From: <strong>{cartRestaurant.name}</strong>
          </div>
        )}

        {/* Empty State */}
        {isEmpty ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">🛒</div>

            <p className="cart-empty-title">Your cart is empty</p>

            <p className="cart-empty-subtitle">
              Add items from a restaurant to get started
            </p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="cart-items-list">
              {items.map((item) => (
                <div key={item._id} className="cart-item">
                  {/* Image */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cart-item-image"
                    />
                  ) : (
                    <div className="cart-item-placeholder">🍛</div>
                  )}

                  {/* Info */}
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>

                    <div className="cart-item-price">₹{item.price} each</div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="cart-quantity-control">
                    <button
                      className="cart-qty-button"
                      onClick={() =>
                        updateQuantity(item._id, item.quantity - 1)
                      }
                    >
                      −
                    </button>

                    <span className="cart-qty-value">{item.quantity}</span>

                    <button
                      className="cart-qty-button"
                      onClick={() =>
                        updateQuantity(item._id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="cart-item-total">
                    ₹{item.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="cart-footer">
              <div className="cart-bill-row">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="cart-bill-row">
                <span>Delivery fee</span>
                <span>₹{deliveryFee}</span>
              </div>

              <div className="cart-bill-row">
                <span>GST (5%)</span>
                <span>₹{tax}</span>
              </div>

              <div className="cart-total-row">
                <span>Total</span>
                <span>₹{total}</span>
              </div>

              <button className="cart-checkout-button" onClick={handleCheckout}>
                Proceed to Checkout →
              </button>

              <button className="cart-clear-button" onClick={clearCart}>
                Clear cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
