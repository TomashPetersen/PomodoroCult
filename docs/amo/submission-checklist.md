# Firefox AMO Submission Checklist

## 1. Final package files

Before opening AMO Developer Hub, prepare these files locally:

- `dist-firefox/`
- `artifacts/pomodoro-cult-firefox.xpi`
- `artifacts/pomodoro-cult-firefox-source.zip`

Build commands:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
.\scripts\package-firefox-artifacts.ps1
```

## 2. Listing fields

Use these values in the AMO form:

- **Add-on name:** `Pomodoro Cult`
- **Author:** `Denis Volkov`
- **Category:** `Productivity`
- **Support email:** `dgvolkovhard@gmail.com`
- **Homepage:** `https://github.com/TomashPetersen/PomodoroCult`
- **Support site:** `https://github.com/TomashPetersen/PomodoroCult/issues`
- **Privacy policy:** `https://tomashpetersen.github.io/PomodoroCult/privacy/`
- **License:** `Mozilla Public License 2.0`

Text sources:

- English listing: [listing.en.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/listing.en.md)
- Russian listing: [listing.ru.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/listing.ru.md)
- Reviewer note: [reviewer-note.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/reviewer-note.md)
- Source submission notes: [source-submission.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/source-submission.md)

## 3. Promo materials

Prepare these assets before submission:

- Add-on icon: use the Firefox icon set generated from the approved logo source
- Minimum 3 screenshots, recommended 4 or 5
- Recommended screenshot ratio: about `1.6:1`
- Good target size: around `1280x800`

Suggested screenshot set:

1. Work timer running
2. Break timer state
3. Task selection dropdown
4. Statistics screen
5. Settings screen with language option

Rules for screenshots:

- show the real UI, not mockups
- no tutorial text overlays inside the screenshots
- keep Russian and English screenshots separate if you decide to upload both
- make sure the toolbar icon matches the final Firefox icon set

## 4. Privacy and permissions consistency

Before upload, confirm these statements stay true:

- no remote backend
- no analytics or telemetry
- no host permissions
- browser data stays in local extension storage

Firefox permissions currently used:

- `storage`
- `notifications`
- `alarms`

Their explanations must match:

- [index.md](/D:/Projects/MyProjects/PomodoroCult/docs/privacy/index.md)
- [listing.en.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/listing.en.md)
- [listing.ru.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/listing.ru.md)
- [reviewer-note.md](/D:/Projects/MyProjects/PomodoroCult/docs/amo/reviewer-note.md)

## 5. AMO upload flow

1. Open [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/)
2. Choose a listed add-on submission
3. Upload `artifacts/pomodoro-cult-firefox.xpi`
4. Upload the source package if AMO requests it
5. Fill in the listing fields from the docs listed above
6. Add screenshots and icon
7. Add reviewer notes
8. Submit for review and signing

## 6. Final checks after signing

After AMO signs the add-on:

1. Download the signed package
2. Install it in Firefox
3. Verify:
   - toolbar icon uses the new Firefox branding
   - popup opens normally
   - timer completes in the background
   - notification icon is correct
   - listing text and privacy links resolve correctly
