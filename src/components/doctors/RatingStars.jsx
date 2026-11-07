import { FaStar } from "react-icons/fa";

export default function RatingStars({
  value = 0,
  interactive = false,
  onChange,
  label = "Valoración",
}) {
  return (
    <div
      className={`rating ${interactive ? "rating--interactive" : ""}`}
      aria-label={`${label}: ${value} de 5`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star === value ? 0 : star)}
            aria-label={
              star === value
                ? "Quitar valoración"
                : `Valorar con ${star} estrellas`
            }
          >
            <FaStar className={star <= value ? "filled" : ""} />
          </button>
        ) : (
          <FaStar
            key={star}
            className={star <= Math.round(value) ? "filled" : ""}
          />
        ),
      )}
      {!interactive && Number(value) > 0 && (
        <span>{Number(value).toFixed(1)}</span>
      )}
    </div>
  );
}
