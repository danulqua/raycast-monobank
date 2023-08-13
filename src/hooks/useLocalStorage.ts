import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getLocalStorageValue()
      .then((json) => {
        if (!json) {
          setLocalStorageValue(initialValue);
          setData(initialValue);
          return;
        }

        const value: T = JSON.parse(json);
        setData(value);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    setLocalStorageValue(data);
  }, [data]);

  async function setLocalStorageValue(newValue: T) {
    await LocalStorage.setItem(key, JSON.stringify(newValue));
  }

  function getLocalStorageValue() {
    return LocalStorage.getItem<string>(key);
  }

  return {
    data,
    setData,
    isLoading,
  };
}
