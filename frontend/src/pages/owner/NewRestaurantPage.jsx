import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import RestaurantForm from "../../components/RestaurantForm";
import "./NewRestaurantPage.css";

const NewRestaurantPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (formData) => {
    setIsLoading(true);

    try {
      const res = await API.post("/restaurants", formData);

      navigate("/owner/dashboard", {
        state: {
          message:
            "Restaurant submitted successfully and is awaiting admin approval.",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-restaurant-page">
      <div className="new-restaurant-header">
        <h1 className="new-restaurant-title">List Your Restaurant</h1>

        <p className="new-restaurant-subtitle">
          Fill in the details below. Your restaurant will be reviewed by an
          admin before appearing to customers.
        </p>
      </div>

      <RestaurantForm
        onSubmit={handleCreate}
        isLoading={isLoading}
        submitLabel="Create Restaurant"
      />
    </div>
  );
};

export default NewRestaurantPage;
