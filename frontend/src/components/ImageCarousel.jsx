import { useState, useEffect, useCallback } from "react";
import "./ImageCarousel.css";

const ImageCarousel = ({
  images = [],
  alt = "Restaurant image",
  autoPlay = true,
  autoPlayDelay = 4000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 400);
  }, [images.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 400);
  }, [images.length, isTransitioning]);

  const goToIndex = (index) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  useEffect(() => {
    if (!autoPlay || images.length <= 1 || isHovered) return;

    const interval = setInterval(goToNext, autoPlayDelay);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayDelay, images.length, isHovered, goToNext]);

  if (!images || images.length === 0) {
    return (
      <div className="image-carousel image-carousel--placeholder">
        <span className="image-carousel__placeholder-icon">🍽️</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="image-carousel">
        <img src={images[0]} alt={alt} className="image-carousel__image" />
      </div>
    );
  }

  return (
    <div
      className="image-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image track */}
      <div className="image-carousel__track">
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`${alt} ${index + 1}`}
            className={`image-carousel__image ${
              index === currentIndex
                ? "image-carousel__image--active"
                : "image-carousel__image--hidden"
            }`}
          />
        ))}
      </div>

      {/* Left arrow */}
      <button
        className="image-carousel__arrow image-carousel__arrow--left"
        onClick={goToPrev}
        aria-label="Previous image"
      >
        ‹
      </button>

      {/* Right arrow */}
      <button
        className="image-carousel__arrow image-carousel__arrow--right"
        onClick={goToNext}
        aria-label="Next image"
      >
        ›
      </button>

      {/* Image counter (top right) */}
      <div className="image-carousel__counter">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Dot indicators */}
      <div className="image-carousel__dots">
        {images.map((_, index) => (
          <button
            key={index}
            className={`image-carousel__dot ${
              index === currentIndex ? "image-carousel__dot--active" : ""
            }`}
            onClick={() => goToIndex(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
