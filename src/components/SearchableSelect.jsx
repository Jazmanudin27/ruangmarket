import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

/**
 * SearchableSelect
 * Replaces native <select> with a searchable dropdown.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "-- Pilih --",
  disabled = false,
  isClearable = false,
  style = {},
  dropUp = false,
  size = "md",
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filteredOptions = options.filter((o) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const l = String(o.label || "").toLowerCase();
    const sub = String(o.subtitle || "").toLowerCase();
    const v = String(o.value || "").toLowerCase();
    return l.includes(s) || sub.includes(s) || v.includes(s);
  });

  const isSmall = size === "sm";

  return (
    <div
      ref={containerRef}
      id={id}
      style={{
        position: "relative",
        width: "100%",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: isSmall ? "4px 8px" : "7px 11px",
          borderRadius: "7px",
          border: isOpen ? "1px solid #2563eb" : "1px solid #cbd5e1",
          backgroundColor: disabled ? "#f1f5f9" : "#ffffff",
          color: selectedOption ? "#0f172a" : "#94a3b8",
          fontSize: isSmall ? "11px" : "12px",
          fontWeight: "500",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: isOpen ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
          minHeight: isSmall ? "28px" : "36px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {selectedOption?.color && (
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: selectedOption.color,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          {isClearable && selectedOption && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{ padding: "2px", cursor: "pointer", color: "#94a3b8" }}
              title="Hapus"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            color={disabled ? "#cbd5e1" : "#64748b"}
            style={{
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(dropUp
              ? { bottom: "100%", marginBottom: "4px" }
              : { top: "100%", marginTop: "4px" }),
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "260px",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid #f1f5f9",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Search size={13} color="#94a3b8" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik untuk mencari..."
              style={{
                width: "100%",
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                fontSize: "11.5px",
                color: "#0f172a",
                padding: "2px 0",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "none",
                  padding: "2px",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            style={{
              overflowY: "auto",
              maxHeight: "200px",
              padding: "4px 0",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  fontSize: "11.5px",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 12px",
                      fontSize: "12px",
                      color: isSelected ? "#1d4ed8" : "#334155",
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                      fontWeight: isSelected ? "700" : "500",
                      cursor: "pointer",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {opt.color && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: opt.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt.label}
                        </div>
                        {opt.subtitle && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#94a3b8",
                              fontWeight: "normal",
                            }}
                          >
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        size={14}
                        color="#2563eb"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
