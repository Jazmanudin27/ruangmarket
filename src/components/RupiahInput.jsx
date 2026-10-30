import React, { useState, useEffect } from "react";

/**
 * RupiahInput
 * Input field for numeric / rupiah values with thousand separator (e.g. 20.000).
 * Preserves clean number in parent state onChange(number).
 */
export default function RupiahInput({
  value,
  onChange,
  placeholder = "0",
  style = {},
  className = "",
  min = 0,
  max,
  ...props
}) {
  const formatNumber = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const n = Number(val);
    if (isNaN(n)) return "";
    if (n === 0) return "0";
    return n.toLocaleString("id-ID");
  };

  const [displayVal, setDisplayVal] = useState(() => formatNumber(value));

  useEffect(() => {
    const formatted = formatNumber(value);
    setDisplayVal((prev) => {
      const prevNumeric = prev ? Number(prev.replace(/\D/g, "")) : 0;
      const newNumeric = value ? Number(value) : 0;
      if (prevNumeric === newNumeric && prev !== "" && formatted !== "") {
        return prev;
      }
      return formatted;
    });
  }, [value]);

  const handleChange = (e) => {
    const text = e.target.value;
    const raw = text.replace(/\D/g, "");
    if (!raw) {
      setDisplayVal("");
      onChange(min > 0 ? min : 0);
      return;
    }

    let num = Number(raw);
    if (max !== undefined && num > max) num = max;

    setDisplayVal(num.toLocaleString("id-ID"));
    onChange(num);
  };

  const handleBlur = () => {
    if (displayVal === "") {
      const fallback = min > 0 ? min : 0;
      setDisplayVal(formatNumber(fallback));
      onChange(fallback);
    }
  };

  const handleFocus = (e) => {
    if (displayVal === "0" || displayVal === "") {
      e.target.select();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      style={{
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
      className={className}
      {...props}
    />
  );
}

