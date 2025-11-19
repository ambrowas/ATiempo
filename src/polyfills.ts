if (typeof globalThis !== "undefined" && !globalThis.__publicField) {
  const establishNormalProperty = (obj: any, key: PropertyKey, value: any) =>
    key in obj
      ? Object.defineProperty(obj, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value,
        })
      : ((obj as any)[key] = value);

  globalThis.__publicField = (obj: any, value: any) => {
    establishNormalProperty(obj, "prototype", { value, configurable: true });
    return value;
  };
}
