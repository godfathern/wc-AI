# Player photos (placeholders)

These six files (`player1.svg` … `player6.svg`) are **placeholder silhouettes**
shown in the centre of the knockout bracket, echoing the reference poster.
They are generic graphics, not real player photos — replace them with your own.

## How to replace with your own photos

**Easiest (no code change):** overwrite each file in this folder, keeping the
same name. If your photos are PNG/JPG, save them as `player1.png` (etc.) and
update the six paths in the `PLAYER_PHOTOS` array near the top of `app.js`.

**Or point at any filenames:** edit `PLAYER_PHOTOS` in `app.js`:

```js
const PLAYER_PHOTOS = [
  'assets/players/messi.jpg',
  'assets/players/ronaldo.jpg',
  // ...six entries total
];
```

## Tips
- Use **portrait** images, roughly **3:4** (e.g. 120×160 or larger). They're
  shown in rounded cards and cropped to fit (`object-fit: cover`).
- Any web image format works: `.svg`, `.png`, `.jpg`, `.webp`.
- Make sure you have the right to publish whatever photos you use.
