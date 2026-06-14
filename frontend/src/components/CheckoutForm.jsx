//This component renders Stripes prebuilt card input UI.
import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./CheckoutForm.css";

export default function CheckoutForm({ totalAmount, onSuccess, onBack }) {
  //useStripe() gives the Stripe.js instance
  //useElements() gives access to the mounted PaymentElement
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMsg("");

    //stripe.confirmPayment sends the card data directly from the PaymentElement to Stripes servers.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?success=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* PaymentElement renders the full card form (number, expiry, CVC, postal code) */}
      {/* Stripe auto detects card type and shows the right icon */}
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMsg && <div className="stripe-error-box">{errorMsg}</div>}

      <div className="checkout-btn-row">
        <button type="button" onClick={onBack} className="back-btn">
          ← Back
        </button>

        <button
          type="submit"
          disabled={!stripe || loading}
          className={`pay-btn ${loading ? "pay-btn-loading" : ""}`}
        >
          {loading ? "Processing..." : `Pay ₹${totalAmount}`}
        </button>
      </div>
    </form>
  );
}
