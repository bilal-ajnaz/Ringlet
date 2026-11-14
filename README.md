# Ringlet
Custom Ringtones and Alarm Audios

This repo is the Ringlet website: a static site with no build step.

| File | What it is |
| --- | --- |
| `index.html` | The home page |
| `privacy.html` | Privacy policy (use its URL in App Store Connect) |
| `support.html` | Support page (use its URL in App Store Connect) |
| `styles.css`, `tokens.css`, `base.css` | Styles. Colours come from the app's `Theme.swift` palette |
| `js/main.js` | Nav menu, iPhone/iPad switcher, pinned screens, and the starter-tone player (a port of `BeatSynth` from the app's `Audio/Beat.swift`) |
| `assets/screens/` | Real app screens, cropped from the App Store screenshots |

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Publish on GitHub Pages

Settings › Pages › Deploy from a branch › `main` / root. The `.nojekyll` file makes Pages serve the files as they are.

## Before launch

1. **App Store link:** set `APP_STORE_URL` at the top of `js/main.js`. Until then every "Download on the App Store" button scrolls to the download section.
2. **Support email:** replace the dashed `support email to be added` placeholder in `privacy.html` and `support.html`.
3. **Swap a screen:** each screenshot sits in a `data-slot`. Replace the file in `assets/screens/` with the same name, or call `hallmarkSlots({ hero: 'assets/new.webp' })`.
