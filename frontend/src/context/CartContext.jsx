import { createContext, useContext, useReducer } from "react";

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const { item, restaurant } = action.payload;
      if (state.restaurantId && state.restaurantId !== restaurant._id) {
        return {
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          items: [{ ...item, quantity: 1 }],
        };
      }

      //Check if item already exists in cart
      const existingIndex = state.items.findIndex((i) => i._id === item._id);

      if (existingIndex >= 0) {
        //Item exists -> increment quantity
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + 1,
        };
        return { ...state, items: updatedItems };
      }

      //New item -> add to cart with quantity 1
      return {
        ...state,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        items: [...state.items, { ...item, quantity: 1 }],
      };
    }

    case "REMOVE_ITEM": {
      const updatedItems = state.items
        .map((i) =>
          i._id === action.payload ? { ...i, quantity: i.quantity - 1 } : i,
        )
        .filter((i) => i.quantity > 0); //Remove items with quantity 0

      return {
        ...state,
        items: updatedItems,
        //If cart is now empty, also clear restaurant info
        restaurantId: updatedItems.length > 0 ? state.restaurantId : null,
        restaurantName: updatedItems.length > 0 ? state.restaurantName : "",
      };
    }

    case "CLEAR_CART":
      return { restaurantId: null, restaurantName: "", items: [] };

    default:
      return state;
  }
};

const initialState = {
  restaurantId: null,
  restaurantName: "",
  items: [], //Each item: { _id, name, price, image, isVeg, quantity }
};

export const CartProvider = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  const addToCart = (item, restaurant) =>
    dispatch({ type: "ADD_ITEM", payload: { item, restaurant } });

  const removeFromCart = (itemId) =>
    dispatch({ type: "REMOVE_ITEM", payload: itemId });

  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = cart.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
