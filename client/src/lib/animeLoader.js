// Shared animejs loader — single import point for hooks and components
let animeLoadPromise = null;
let _animeReady = false;

export function loadAnime() {
  if (!animeLoadPromise) {
    animeLoadPromise = import('animejs')
      .then((mod) => {
        window.anime = mod.default || mod;
        _animeReady = true;
        return window.anime;
      })
      .catch(() => {
        _animeReady = false;
      });
  }
  return animeLoadPromise;
}

export function isAnimeReady() {
  return _animeReady;
}
