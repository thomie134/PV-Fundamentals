/** Shared input controls for diagrams: Slider, Segmented, Toggle, Readout. */
import { useId, type ReactNode } from 'react';
import { fmt } from '@/lib/format';

interface SliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  /** Logarithmic slider (for doping, absorption coefficient…). */
  log?: boolean;
  format?: (v: number) => string;
  /** Optional preset marks shown under the track. */
  marks?: { value: number; label: string }[];
}

const LOG_STEPS = 1000;

export function Slider({ label, value, min, max, step = 1, onChange, unit, log = false, format, marks }: SliderProps) {
  const id = useId();
  const show = format ?? ((v: number) => fmt(v, 3));
  const toPos = (v: number) => (log ? (Math.log10(v / min) / Math.log10(max / min)) * LOG_STEPS : v);
  const fromPos = (p: number) => (log ? min * (max / min) ** (p / LOG_STEPS) : p);
  const text = `${show(value)}${unit ? ` ${unit}` : ''}`;
  const pct = ((toPos(value) - toPos(min)) / (toPos(max) - toPos(min))) * 100;
  return (
    <div className="slider">
      <div className="slider__row">
        <label htmlFor={id} className="slider__label">
          {label}
        </label>
        <output htmlFor={id} className="slider__value num">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="slider__input"
        min={log ? 0 : min}
        max={log ? LOG_STEPS : max}
        step={log ? 1 : step}
        value={toPos(value)}
        aria-valuetext={text}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => {
          const v = fromPos(Number(e.target.value));
          onChange(log ? Number(v.toPrecision(3)) : v);
        }}
      />
      {marks && (
        <div className="slider__marks">
          {marks.map((m) => (
            <button key={m.label} type="button" className="chip chip--small" aria-pressed={Math.abs(m.value - value) < 1e-9 * Math.max(1, Math.abs(m.value))} onClick={() => onChange(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: ReactNode; value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="segmented__label">
        {label}
      </span>
      <div className="segmented__track">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="segmented__opt" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden>
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__label">{label}</span>
    </label>
  );
}

export function Readout({ label, value, unit, emphasis = false, note }: { label: ReactNode; value: ReactNode; unit?: ReactNode; emphasis?: boolean; note?: ReactNode }) {
  return (
    <div className={`readout ${emphasis ? 'readout--em' : ''}`}>
      <div className="readout__label">{label}</div>
      <div className="readout__value">
        <span className="num">{value}</span>
        {unit && <span className="readout__unit"> {unit}</span>}
      </div>
      {note && <div className="readout__note">{note}</div>}
    </div>
  );
}
