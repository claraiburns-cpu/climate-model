import { useId } from "react";

/** Small "i" button that shows a short explanation on hover, keyboard focus, or tap. */
export default function InfoTip({ children, label = "More information", align = "center" }) {
  const id = useId();
  return (
    <span className={`infotip infotip--${align}`}>
      <button type="button" className="infotip__btn" aria-label={label} aria-describedby={id}>
        i
      </button>
      <span role="tooltip" id={id} className="infotip__bubble">
        {children}
      </span>
    </span>
  );
}
