import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../api/axios.js";
import CheckoutForm from "../components/CheckoutForm.jsx";
import { loadStripe } from "@stripe/stripe-js"; //connects frontend to Stripe
import { Elements } from "@stripe/react-stripe-js"; //provides Stripe payment UI.
import "./CartPage.css";

//loadStripe is called outside the component so it only runs once
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 30;

export default function CartPage() {
  const { cart, addToCart, removeFromCart, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("cart");

  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [clientSecret, setClientSecret] = useState("");
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tax = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + DELIVERY_FEE + tax;

  const handleProceedToPayment = async () => {
    if (
      !address.street ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      setError("Please fill in all address fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/orders/create-intent", {
        restaurantId: cart.restaurantId,
        items: cart.items.map((item) => ({
          menuItemId: item._id,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
      });

      setClientSecret(res.data.clientSecret);
      setBreakdown(res.data.breakdown);
      setStep("payment");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="emptyCartContainer">
        <div className="emptyCartIcon">🛒</div>
        <h2 className="emptyCartTitle">Your cart is empty</h2>
        <p className="emptyCartSubtitle">
          Add items from a restaurant to get started
        </p>
        <button className="browseBtn" onClick={() => navigate("/")}>
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="cartPageContainer">
      {/* Steps */}
      <div className="stepsContainer">
        {["cart", "address", "payment"].map((s, i) => (
          <div key={s} className="stepWrapper">
            <div
              className={`stepCircle ${
                step === s
                  ? "activeStep"
                  : ["cart", "address", "payment"].indexOf(step) >
                      ["cart", "address", "payment"].indexOf(s)
                    ? "completedStep"
                    : "inactiveStep"
              }`}
            >
              {i + 1}
            </div>

            <span className={`stepLabel ${step === s ? "activeLabel" : ""}`}>
              {s}
            </span>

            {i < 2 && <div className="stepLine" />}
          </div>
        ))}
      </div>

      <div className="mainGrid">
        {/* LEFT */}
        <div>
          {/* CART STEP */}
          {step === "cart" && (
            <div>
              <h2 className="restaurantTitle">{cart.restaurantName}</h2>

              {cart.items.map((item) => (
                <div key={item._id} className="cartItemRow">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="itemImage"
                    />
                  )}

                  <div className="itemInfo">
                    <div className="itemNameRow">
                      <div
                        className={`vegDot ${item.isVeg ? "veg" : "nonVeg"}`}
                      >
                        <div className="vegInnerDot" />
                      </div>
                      <span className="itemName">{item.name}</span>
                    </div>

                    <div className="itemPrice">₹{item.price}</div>
                  </div>

                  <div className="qtyBox">
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="qtyBtn"
                    >
                      −
                    </button>
                    <span className="qtyText">{item.quantity}</span>
                    <button
                      onClick={() =>
                        addToCart(item, { _id: cart.restaurantId })
                      }
                      className="qtyBtn"
                    >
                      +
                    </button>
                  </div>

                  <div className="itemTotal">₹{item.price * item.quantity}</div>
                </div>
              ))}

              <button className="primaryBtn" onClick={() => setStep("address")}>
                Proceed to Address →
              </button>
            </div>
          )}

          {/* ADDRESS STEP */}
          {step === "address" && (
            <div>
              <h2 className="sectionTitle">Delivery Address</h2>

              {[
                {
                  key: "street",
                  label: "Street / Flat No.",
                  placeholder: "e.g. 42, MG Road",
                },
                { key: "city", label: "City", placeholder: "e.g. Ahmedabad" },
                { key: "state", label: "State", placeholder: "e.g. Gujarat" },
                {
                  key: "pincode",
                  label: "Pincode",
                  placeholder: "e.g. 380001",
                },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="inputGroup">
                  <label className="inputLabel">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={address[key]}
                    onChange={(e) =>
                      setAddress({ ...address, [key]: e.target.value })
                    }
                    className="inputBox"
                  />
                </div>
              ))}

              {error && <p className="errorText">{error}</p>}

              <div className="btnRow">
                <button
                  className="secondaryBtn"
                  onClick={() => setStep("cart")}
                >
                  ← Back
                </button>

                <button
                  className="primaryBtn"
                  onClick={handleProceedToPayment}
                  disabled={loading}
                >
                  {loading ? "Preparing checkout..." : "Proceed to Payment →"}
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT STEP */}
          {step === "payment" && clientSecret && (
            <div>
              <h2 className="sectionTitle">Secure Payment</h2>

              <div className="testBox">
                <strong>Test mode:</strong> Use card number{" "}
                <code className="testCard">4242 4242 4242 4242</code>, any
                future date, any 3-digit CVC.
              </div>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  clientSecret={clientSecret}
                  totalAmount={breakdown?.totalAmount || grandTotal}
                  onSuccess={() => {
                    clearCart();
                    navigate("/orders?success=true");
                  }}
                  onBack={() => setStep("address")}
                />
              </Elements>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="summaryBox">
          <h3 className="summaryTitle">Order Summary</h3>

          {cart.items.map((item) => (
            <div key={item._id} className="summaryRow">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}

          <div className="summaryDivider" />

          {[
            { label: "Subtotal", value: breakdown?.subtotal ?? totalAmount },
            {
              label: "Delivery fee",
              value: breakdown?.deliveryFee ?? DELIVERY_FEE,
            },
            { label: "GST (5%)", value: breakdown?.tax ?? tax },
          ].map(({ label, value }) => (
            <div key={label} className="summaryRowMuted">
              <span>{label}</span>
              <span>₹{value}</span>
            </div>
          ))}

          <div className="totalRow">
            <span>Total</span>
            <span>₹{breakdown?.totalAmount ?? grandTotal}</span>
          </div>

          <div className="stripeNote">🔒 Payments secured by Stripe</div>
        </div>
      </div>
    </div>
  );
}
