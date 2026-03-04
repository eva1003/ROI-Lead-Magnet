/**
 * AutocompleteInput – Eingabefeld mit Live-Vorschlägen aus dem CompanyIndex.
 *
 * Props:
 *  value         – aktueller Eingabetext
 *  onSelect      – wird aufgerufen wenn ein Eintrag gewählt wird (oder "Firma nicht gefunden")
 *  placeholder   – optionaler Placeholder
 *  disabled      – Feld deaktivieren (z. B. nach Bestätigung)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { CompanyRecord } from "../../data/companyIndex";
import { getCompanySuggestions } from "../../data/companyIndex";

export interface AutocompleteSelection {
  inputValue: string;
  company: CompanyRecord | null; // null = "Firma nicht gefunden"
}

interface Props {
  value: string;
  onSelect: (selection: AutocompleteSelection) => void;
  onInputChange?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const NO_MATCH_SENTINEL = "__no_match__";

export function AutocompleteInput({
  value,
  onSelect,
  onInputChange,
  placeholder = "Unternehmensname eingeben …",
  disabled = false,
  id,
}: Props) {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<CompanyRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value → inputText
  useEffect(() => {
    setInputText(value);
  }, [value]);

  const fetchSuggestions = useCallback((query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const results = getCompanySuggestions(query, 8);
    setSuggestions(results);
    setOpen(results.length > 0 || query.trim().length >= 2);
    setActiveIdx(-1);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    fetchSuggestions(text);
    onInputChange?.(text);
  };

  const handleSelect = (company: CompanyRecord | null, displayText: string) => {
    setInputText(displayText);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
    onSelect({ inputValue: displayText, company });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    // Total items: suggestions + 1 "Firma nicht gefunden"
    const totalItems = suggestions.length + 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        handleSelect(suggestions[activeIdx], suggestions[activeIdx].name);
      } else if (activeIdx === suggestions.length) {
        handleSelect(null, inputText);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      items[activeIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  return (
    <div
      className="autocomplete-container"
      ref={containerRef}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <input
        id={id}
        ref={inputRef}
        type="text"
        className="autocomplete-input"
        value={inputText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputText.trim().length >= 2) fetchSuggestions(inputText);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={
          activeIdx >= 0 && id ? `${id}-option-${activeIdx}` : undefined
        }
      />
      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          ref={listRef}
          className="autocomplete-dropdown"
          role="listbox"
        >
          {suggestions.map((company, idx) => (
            <li
              key={company.id}
              id={id ? `${id}-option-${idx}` : undefined}
              role="option"
              aria-selected={activeIdx === idx}
              className={`autocomplete-option${activeIdx === idx ? " autocomplete-option--active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(company, company.name);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <span className="autocomplete-option-name">{company.name}</span>
              <span className="autocomplete-option-badges">
                {company.sources.sbti && (
                  <span className="source-badge source-badge--sbti">SBTi</span>
                )}
                {company.sources.cdp && (
                  <span className="source-badge source-badge--cdp">CDP</span>
                )}
                {company.sources.csrd && (
                  <span className="source-badge source-badge--csrd">CSRD</span>
                )}
              </span>
            </li>
          ))}
          <li
            id={id ? `${id}-option-${suggestions.length}` : undefined}
            role="option"
            aria-selected={activeIdx === suggestions.length}
            className={`autocomplete-option autocomplete-option--no-match${activeIdx === suggestions.length ? " autocomplete-option--active" : ""}`}
            data-sentinel={NO_MATCH_SENTINEL}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(null, inputText);
            }}
            onMouseEnter={() => setActiveIdx(suggestions.length)}
          >
            Firma nicht gefunden – als unbekannt speichern
          </li>
        </ul>
      )}
    </div>
  );
}
