import "./MenuItemCard.css";

const MenuItemCard = ({ item, onAddToCart }) => {
  const {
    name,
    description,
    price,
    image,
    isVegetarian,
    isVegan,
    preparationTime,
    spiceLevel,
    tags,
  } = item;

  //Veg/nonveg dot indicator
  const dotColor = isVegetarian || isVegan ? "#2e7d32" : "#c62828";

  return (
    <div className="menu-item-card">
      {/* Left: Info */}
      <div className="menu-item-card__info">
        <div className="menu-item-card__header">
          {/* Veg/Non-veg indicator dot */}
          <div
            className="menu-item-card__dot"
            style={{ borderColor: dotColor }}
          >
            <div
              className="menu-item-card__dot-inner"
              style={{ background: dotColor }}
            />
          </div>

          <span className="menu-item-card__name">{name}</span>

          {isVegan && <span className="menu-item-card__vegan">VEGAN</span>}
        </div>

        {description && (
          <p className="menu-item-card__description">{description}</p>
        )}

        <div className="menu-item-card__price">₹{price}</div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="menu-item-card__tags">
            {tags.map((tag, i) => (
              <span key={i} className="menu-item-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="menu-item-card__meta">
          {preparationTime && `🕐 ${preparationTime} mins`}
          {spiceLevel && ` • 🌶️ ${spiceLevel.replace("_", " ")}`}
        </div>
      </div>

      {/* Right: Image + Add button */}
      <div className="menu-item-card__image-wrapper">
        {image ? (
          <img src={image} alt={name} className="menu-item-card__image" />
        ) : (
          <div className="menu-item-card__image-placeholder">🍛</div>
        )}

        {onAddToCart && (
          <button
            className="menu-item-card__add-button"
            onClick={() => onAddToCart(item)}
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;
