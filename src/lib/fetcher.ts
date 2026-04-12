export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });
export const noCacheFetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());
