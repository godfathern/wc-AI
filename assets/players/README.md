# Center photo

`player4.jpg` is the single large portrait shown in the centre of the knockout
bracket. Replace it with your own image.

## How to replace
- **Easiest:** overwrite `assets/players/player4.jpg` with your photo, keeping
  the same name. Any web format works (`.jpg` / `.png` / `.webp`).
- Or point at a different file: edit `HERO_PHOTO` near the top of `app.js`:
  ```js
  const HERO_PHOTO = 'assets/players/my-photo.jpg';
  ```

## Tips
- Use a **portrait** image (~3:4, e.g. 600×800). It's shown in a rounded card
  and cropped to fit (`object-fit: cover`).
- **HEIC (iPhone) does NOT work in browsers** — convert to JPG first. On a Mac:
  `sips -s format jpeg -Z 800 photo.HEIC --out photo.jpg`
- Make sure you have the right to publish whatever photo you use.
