export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Network response was not ok");
  }
  return res.json();
};
