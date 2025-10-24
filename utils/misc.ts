export function keysToLowerCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToLowerCase)
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase(), keysToLowerCase(v)])
    )
  }
  return obj
}
