const cache = new Map();

export async function loadJSON(path) {
  if (!cache.has(path)) {
    const promise = fetch(path).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
      }
      return res.json();
    });
    cache.set(path, promise);
  }
  return cache.get(path);
}
