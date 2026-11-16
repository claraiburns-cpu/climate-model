import InfoTip from "./InfoTip.jsx";

/** The "Income Convergence by 2100" toggle, shared by Explore and Challenge. */
export default function ConvergenceSwitch({ on, onChange, id = "convergence", align = "right" }) {
  return (
    <div className="toggle-row">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`switch${on ? " is-on" : ""}`}
        onClick={() => onChange(!on)}
        id={id}
      >
        <span className="switch__knob" />
      </button>
      <label htmlFor={id} className="toggle-row__label">Income Convergence by 2100</label>
      <InfoTip label="About Income Convergence" align={align}>
        When on, you choose rich-country GDP growth. Middle-income and poor-country growth are then set
        automatically so all three groups reach the same GDP per capita in 2100 (the parity rule used in the course homework).
        When off, all three rates can be set independently.
      </InfoTip>
    </div>
  );
}
