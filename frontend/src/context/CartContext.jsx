import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [cartRestaurant, setCartRestaurant] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  //Load cart from localStorage on first render
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("feedgrid_cart");
      const savedRestaurant = localStorage.getItem("feedgrid_cart_restaurant");

      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      if (savedRestaurant) {
        setCartRestaurant(JSON.parse(savedRestaurant));
      }
    } catch (error) {
      localStorage.removeItem("feedgrid_cart");
      localStorage.removeItem("feedgrid_cart_restaurant");
    }
  }, []);

  //Persist cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("feedgrid_cart", JSON.stringify(items));
    localStorage.setItem(
      "feedgrid_cart_restaurant",
      JSON.stringify(cartRestaurant),
    );
  }, [items, cartRestaurant]);

  //add item
  const addItem = useCallback(
    (item, restaurant) => {
      //Check if adding from a different restaurant
      if (
        cartRestaurant &&
        cartRestaurant._id !== restaurant._id &&
        items.length > 0
      ) {
        return {
          success: false,
          requiresConfirmation: true,
          message: `Your cart has items from ${cartRestaurant.name}. Clear cart and add from ${restaurant.name}?`,
          newItem: item,
          newRestaurant: restaurant,
        };
      }

      //Check if item already in cart
      const existingItem = items.find((i) => i._id === item._id);

      if (existingItem) {
        //Increase quantity instead of adding a duplicate
        setItems((prev) =>
          prev.map((i) =>
            i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        );
      } else {
        //Add new item with quantity 1
        setItems((prev) => [
          ...prev,
          {
            _id: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            isVegetarian: item.isVegetarian,
            quantity: 1,
            restaurantId: restaurant._id,
          },
        ]);

        //Set the cart restaurant when adding the first item
        if (items.length === 0) {
          setCartRestaurant(restaurant);
        }
      }

      //Update cart restaurant in all cases
      setCartRestaurant(restaurant);

      return { success: true };
    },
    [items, cartRestaurant],
  );

  //Called when user confirms they want to clear the cart and add from new restaurant
  const confirmClearAndAdd = useCallback((newItem, newRestaurant) => {
    setItems([
      {
        _id: newItem._id,
        name: newItem.name,
        price: newItem.price,
        image: newItem.image,
        isVegetarian: newItem.isVegetarian,
        quantity: 1,
        restaurantId: newRestaurant._id,
      },
    ]);
    setCartRestaurant(newRestaurant);
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i._id !== itemId);
      if (updated.length === 0) {
        setCartRestaurant(null);
      }
      return updated;
    });
  }, []);

  const updateQuantity = useCallback(
    (itemId, newQuantity) => {
      if (newQuantity <= 0) {
        removeItem(itemId);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i._id === itemId ? { ...i, quantity: newQuantity } : i,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCartRestaurant(null);
  }, []);

  //Total number of individual items eg: 2x Butter Chicken + 3x Naan = 5
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  //Subtotal sum of (price × quantity) for all items
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const deliveryFee = cartRestaurant ? 30 : 0;

  //5% GST
  const tax = Math.round(subtotal * 0.05);

  //Grand total
  const total = subtotal + deliveryFee + tax;

  const value = {
    items,
    cartRestaurant,
    isCartOpen,
    setIsCartOpen,
    addItem,
    confirmClearAndAdd,
    removeItem,
    updateQuantity,
    clearCart,
    // Computed values
    totalItems,
    subtotal,
    deliveryFee,
    tax,
    total,
    isEmpty: items.length === 0,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

//Custom hook for using cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
