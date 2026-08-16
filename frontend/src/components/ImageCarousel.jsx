import { useMemo, useState } from "react";
import "./ImageCarousel.css";

import shield from "../assets/shield-icon.png";
import trans2 from "../assets/trans2.png";
import trans3 from "../assets/trans3.png";
import trans4 from "../assets/trans4.png";
import trans5 from "../assets/trans5.png";
import trans6 from "../assets/trans6.png";

const slides = [
  {
    id: "business",
    image: shield,
    title: "Business Verification",
  },
  {
    id: "license",
    image: trans2,
    title: "Licenses & Compliance",
  },
  {
    id: "workforce",
    image: trans3,
    title: "Workforce Details",
  },
  {
    id: "projects",
    image: trans4,
    title: "Project History",
  },
  {
    id: "ratings",
    image: trans5,
    title: "Ratings & Reviews",
  },
  {
    id: "documents",
    image: trans6,
    title: "Verified Documents",
  },
];

// Width of each visible position
const WIDTHS = [58, 14, 9, 7, 5, 3];
const GAP = 0.5;

// Calculate left position
const LEFTS = [];
let x = 0;

WIDTHS.forEach((w) => {
  LEFTS.push(x);
  x += w + GAP;
});

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  const visibleSlides = useMemo(() => {
    return [...slides.slice(current), ...slides.slice(0, current)];
  }, [current]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="image-carousel">
      <div className="carousel-window">
        {visibleSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="carousel-item"
            style={{
              width: `${WIDTHS[index]}%`,
              left: `${LEFTS[index]}%`,
            }}
          >
            <img src={slide.image} alt={slide.title} />

            <div className="overlay">
              <h3>{slide.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-nav">
        <button onClick={prev}>
          &#8249;
        </button>

        <button onClick={next}>
          &#8250;
        </button>
      </div>
    </div>
  );
}