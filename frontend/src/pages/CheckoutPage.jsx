import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createPaymentIntent, createOrder } from "../services/orderService";
import LoadingSpinner from "../components/LoadingSpinner";

import "./CheckoutPage.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

//PAYMENT FORM
const PaymentForm = ({
  restaurantId,
  deliveryAddress,
  verifiedAmounts,
  verifiedItems,
  onSuccess,
  setOrderCompleted,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (
      !deliveryAddress.street.trim() ||
      !deliveryAddress.city.trim() ||
      !deliveryAddress.state.trim() ||
      !deliveryAddress.pincode.trim()
    ) {
      setPaymentError("Fill all address fields");
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setPaymentError(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setPaymentError("Payment not completed");
        setIsProcessing(false);
        return;
      }

      // const orderData = {
      //   items: verifiedItems,
      //   stripePaymentIntentId: paymentIntent.id,
      //   amounts: verifiedAmounts,
      // };

      const orderData = {
        restaurantId,
        items: verifiedItems,
        deliveryAddress,
        stripePaymentIntentId: paymentIntent.id,
        amounts: verifiedAmounts,
      };

      const orderResponse = await createOrder(orderData);

      setOrderCompleted(true);
      clearCart();
      onSuccess(orderResponse.order._id);

      clearCart();
      onSuccess(orderResponse.order._id);
    } catch (err) {
      setPaymentError("Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs" }} />

      {paymentError && <div className="payment-error">{paymentError}</div>}

      <button className="pay-btn" disabled={isProcessing || !stripe}>
        {isProcessing ? "Processing..." : `Pay ₹${verifiedAmounts?.total || 0}`}
      </button>

      <p className="secure-text">🔒 Secured by Stripe</p>
    </form>
  );
};

//CHECKOUT PAGE
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, cartRestaurant, subtotal, deliveryFee, tax, total, isEmpty } =
    useCart();
  const { user } = useAuth();

  const [clientSecret, setClientSecret] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [verifiedAmounts, setVerifiedAmounts] = useState(null);
  const [verifiedItems, setVerifiedItems] = useState(null);

  // const [initLoading, setInitLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState(null);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: user?.address?.street || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    pincode: user?.address?.pincode || "",
  });

  // useEffect(() => {
  //   if (isEmpty) navigate("/restaurants");
  // }, [isEmpty, navigate]);

  useEffect(() => {
    if (isEmpty && !orderCompleted) {
      navigate("/restaurants");
    }
  }, [isEmpty, orderCompleted, navigate]);

  // useEffect(() => {
  //   if (isEmpty || !cartRestaurant) return;

  //   const init = async () => {
  //     try {
  //       setInitLoading(true);

  //       const data = await createPaymentIntent({
  //         restaurantId: cartRestaurant._id,
  //         items: items.map((i) => ({
  //           _id: i._id,
  //           quantity: i.quantity,
  //         })),
  //       });

  //       setClientSecret(data.clientSecret);
  //       setVerifiedAmounts(data.amounts);
  //       setVerifiedItems(data.verifiedItems);
  //     } catch (err) {
  //         console.log("Checkout Error:", err);
  //           console.log("Response:", err.response?.data);
  //     } finally {
  //       setInitLoading(false);
  //     }
  //   };

  //   init();
  // }, []);

  const handleAddressChange = (e) => {
    setDeliveryAddress({
      ...deliveryAddress,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinueToPayment = async () => {
    if (
      !deliveryAddress.street.trim() ||
      !deliveryAddress.city.trim() ||
      !deliveryAddress.state.trim() ||
      !deliveryAddress.pincode.trim()
    ) {
      setInitError("Please fill in the complete delivery address.");
      return;
    }

    try {
      setInitLoading(true);
      setInitError(null);

      const data = await createPaymentIntent({
        restaurantId: cartRestaurant._id,
        items: items.map((item) => ({
          _id: item._id,
          quantity: item.quantity,
        })),
        deliveryAddress,
      });

      setClientSecret(data.clientSecret);
      setVerifiedAmounts(data.amounts);
      setVerifiedItems(data.verifiedItems);

      setShowPayment(true);
    } catch (err) {
      console.error(err);

      setInitError(
        err.response?.data?.message || "Failed to initialize payment.",
      );
    } finally {
      setInitLoading(false);
    }
  };

  const stripeAppearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#e85d04",
      borderRadius: "8px",
    },
  };

  if (initLoading) return <LoadingSpinner message="Loading checkout..." />;

  // if (initError)
  //   return (
  //     <div className="error-page">
  //       {initError}
  //       <button onClick={() => navigate("/restaurants")}>Back</button>
  //     </div>
  //   );

  return (
    <div className="checkout-container">
      <h1 className="title">Checkout</h1>

      <div className="layout">
        {/* LEFT */}
        <div>
          <div className="card">
            <h3>Delivery Address</h3>
            {initError && <div className="checkout-error">{initError}</div>}

            <input
              name="street"
              value={deliveryAddress.street}
              onChange={handleAddressChange}
              placeholder="Street"
            />

            <div className="row">
              <input
                name="city"
                value={deliveryAddress.city}
                placeholder="City"
                onChange={handleAddressChange}
              />
              <input
                name="state"
                value={deliveryAddress.state}
                placeholder="State"
                onChange={handleAddressChange}
              />
            </div>

            <input
              name="pincode"
              value={deliveryAddress.pincode}
              placeholder="Pincode"
              onChange={handleAddressChange}
            />
          </div>

          <div className="card">
            {/* <h3>Payment</h3> */}
            {/* <button className="pay-btn" onClick={handleContinueToPayment}>
              Continue to Payment
            </button> */}

            <button
              className="pay-btn"
              onClick={handleContinueToPayment}
              disabled={showPayment || initLoading}
            >
              {initLoading
                ? "Loading Payment..."
                : showPayment
                  ? "Payment Ready"
                  : "Continue to Payment"}
            </button>

            {/* {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: stripeAppearance }}
              >
                <PaymentForm
                  deliveryAddress={deliveryAddress}
                  verifiedAmounts={verifiedAmounts}
                  verifiedItems={verifiedItems}
                  onSuccess={(id) => navigate(`/order-confirmation/${id}`)}
                />
              </Elements>
            )} */}

            {showPayment && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: stripeAppearance,
                }}
              >
                <PaymentForm
                  restaurantId={cartRestaurant?._id}
                  deliveryAddress={deliveryAddress}
                  verifiedAmounts={verifiedAmounts}
                  verifiedItems={verifiedItems}
                  onSuccess={(id) => navigate(`/order-confirmation/${id}`)}
                  //  onSuccess={(id) => navigate(`/orders/${id}`)}
                  setOrderCompleted={setOrderCompleted}
                />
              </Elements>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="summary">
          <div className="card">
            <h3>Order Summary</h3>

            {items.map((item) => (
              <div key={item._id} className="item">
                {item.name} × {item.quantity}
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}

            <hr />

            <div className="row-line">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>

          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
