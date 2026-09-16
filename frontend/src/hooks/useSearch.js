import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "./useDebounce";

export function useSearch(initialValue = "", delay = 300) {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [value, debouncedValue]);

  const clear = () => setValue("");

  const hasValue = useMemo(() => Boolean(value.trim()), [value]);

  return {
    value,
    setValue,
    debouncedValue,
    isSearching,
    clear,
    hasValue,
  };
}