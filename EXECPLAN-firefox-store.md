# Purpose / Big Picture

Pomodoro Cult already has a working Firefox build, but the publication layer is still weaker than the product itself. The current AMO listing and Firefox metadata are too quiet for the `pomodoro` search space, and the existing icon reads as a small, detail-heavy mark instead of a strong tomato-first product symbol.

This ExecPlan tracks the final pre-publication polish for the **existing 1.0.1 Firefox build**. The user-facing result should be simple:

- the add-on name and summary are clearer and more searchable in AMO;
- English and Russian store copy are both publication-ready;
- the Firefox icon looks larger, bolder, and easier to recognize in AMO and `about:addons`;
- the packaged Firefox artifacts are ready for upload without extra guesswork.

## Progress

- [x] [2026-06-08 21:05] Re-checked current Firefox store assets, manifests, and packaging scripts. Confirmed the repository is clean and the Firefox packaging script already produces versioned `.xpi` and source archives from `package.json`.
- [x] [2026-06-08 21:12] Verified that AMO/public strings are driven by `_locales/*/messages.json` and that Firefox uses the dedicated `firefox-icon-*` asset set from `manifest.firefox.ts`.
- [x] [2026-06-08 21:36] Replaced the current Firefox icon system with a new tomato-first mark and regenerated `logo-master-firefox.png` plus `firefox-tomato-icon-16/32/48/128.png`.
- [x] [2026-06-08 21:38] Rewrote AMO listing copy for `en-US` and `ru` with stronger SEO-first naming and summaries while keeping the tone practical and non-hyperbolic.
- [x] [2026-06-08 21:39] Updated Firefox metadata strings to match the new listing naming pack for the still-unreleased `1.0.1` build.
- [x] [2026-06-08 21:45] Rebuilt Firefox artifacts, validated localized metadata, and refreshed submission instructions for AMO panel steps.

## Surprises & Discoveries

- The repository already has clean UTF-8 Russian content in the relevant AMO and locale files; earlier mojibake seen in terminal output was primarily an output-encoding issue, not necessarily corrupted file contents.
- Firefox runtime branding is independent from Chrome runtime branding because Firefox can point to its own dedicated icon filenames, so we can safely improve Firefox-first branding without touching Chrome icons.
- The current package version is already `1.0.1`, and the user explicitly wants to keep that version number because the build has not been submitted yet.

## Decision Log

- Decision: keep the release version at `1.0.1` instead of moving to `1.0.2`.
  Reason: the user has not published this Firefox build yet and wants the branding/SEO pass folded into the same pending release.
- Decision: use **brand + SEO** naming instead of either a pure brand title or a hard rename.
  Reason: this keeps Pomodoro Cult recognizable while making the add-on more legible to AMO search and search-result readers.
- Decision: prioritize a **large tomato-first** symbol for Firefox icons.
  Reason: the current mark has too much fine detail for small AMO cards and the Firefox extensions list.

## Outcomes & Retrospective

- Expected outcome: the published Firefox listing will clearly read as a Pomodoro timer product even before the user opens the full page.
- Expected outcome: the add-on icon will look stronger in search results, `about:addons`, and the toolbar.
- Expected outcome: the repository will contain the exact copy, assets, and packaging flow needed to re-run this submission cleanly.

## Context and Orientation

Important files for this work:

- `manifest.firefox.ts` - Firefox manifest and icon paths
- `_locales/en/messages.json` - Firefox/Chrome manifest English metadata
- `_locales/ru/messages.json` - Firefox/Chrome manifest Russian metadata
- `docs/amo/listing.en.md` - AMO English listing source
- `docs/amo/listing.ru.md` - AMO Russian listing source
- `docs/amo/submission-checklist.md` - AMO upload checklist
- `docs/amo/reviewer-note.md` - reviewer note for runtime and permissions
- `public/icons/firefox-tomato-icon-*.png` - Firefox icon assets
- `assets/branding/logo-master-firefox.png` - store/master branding image
- `scripts/generate-extension-icons.ps1` - current icon generation script
- `scripts/package-firefox-artifacts.ps1` - `.xpi` and source archive packaging

## Plan of Work

1. Replace the current Firefox logo generation flow with a tomato-first branding pass that produces a bold master asset and icon sizes.
2. Rewrite AMO copy for both locales around the same SEO spine: Pomodoro timer, tasks, statistics, Firefox, background countdown, bilingual UI.
3. Update Firefox manifest locale strings so the add-on name/description in Firefox UI align with the listing.
4. Refresh AMO submission notes so the panel workflow matches the new copy and icon assets.
5. Build and package the Firefox release artifacts for the still-unreleased `1.0.1` upload.

## Concrete Steps

1. Update `scripts/generate-extension-icons.ps1` so it generates a new bold tomato-first logo master and the Firefox icon set.
2. Regenerate:
   - `assets/branding/logo-master-firefox.png`
   - `public/icons/firefox-tomato-icon-16.png`
   - `public/icons/firefox-tomato-icon-32.png`
   - `public/icons/firefox-tomato-icon-48.png`
   - `public/icons/firefox-tomato-icon-128.png`
3. Rewrite `docs/amo/listing.en.md` and `docs/amo/listing.ru.md` with:
   - localized SEO title
   - localized summary
   - stronger first paragraph
   - 1.0.1 release notes
   - screenshot caption recommendations
4. Update `_locales/en/messages.json` and `_locales/ru/messages.json` with the Firefox UI metadata strings that match the new naming pack.
5. Refresh `docs/amo/submission-checklist.md` so it points to the updated AMO panel wording and locale workflow.
6. Keep `manifest.firefox.ts` on version `1.0.1`.
7. Run:
   - `npx.cmd tsc --noEmit`
   - `npm.cmd run build:firefox`
   - `.\scripts\package-firefox-artifacts.ps1`
8. Validate the unpacked Firefox build via `dist-firefox/manifest.json`.

## Validation and Acceptance

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
.\scripts\package-firefox-artifacts.ps1
```

Acceptance checks:

- Firefox build still reports version `1.0.1`.
- `about:addons` shows the new localized title and description for `en-US` and `ru`.
- The Firefox icon is visibly larger/bolder than the previous mark at small sizes.
- AMO listing docs contain complete English and Russian copy ready to paste.
- Packaged artifacts exist for the current version:
  - `artifacts/pomodoro-cult-firefox-1.0.1.xpi`
  - `artifacts/pomodoro-cult-firefox-source-1.0.1.zip`

## Idempotence and Recovery

- If the new logo reads poorly at `16px`, simplify internal shapes and regenerate the same filenames; do not change manifest paths.
- If listing SEO wording feels too aggressive in AMO preview, keep the same title structure but soften the body copy; do not remove `Pomodoro` from the first line.
- If packaging fails, rebuild `dist-firefox/` first and then re-run `scripts/package-firefox-artifacts.ps1`.

## Artifacts and Notes

Expected updated artifacts:

- `assets/branding/logo-master-firefox.png`
- `public/icons/firefox-tomato-icon-16.png`
- `public/icons/firefox-tomato-icon-32.png`
- `public/icons/firefox-tomato-icon-48.png`
- `public/icons/firefox-tomato-icon-128.png`
- `docs/amo/listing.en.md`
- `docs/amo/listing.ru.md`
- `docs/amo/submission-checklist.md`
- `_locales/en/messages.json`
- `_locales/ru/messages.json`

Release artifacts to verify:

- `dist-firefox/`
- `artifacts/pomodoro-cult-firefox-1.0.1.xpi`
- `artifacts/pomodoro-cult-firefox-source-1.0.1.zip`

## Interfaces and Dependencies

- Manifest metadata interface: `__MSG_appName__` and `__MSG_appDescription__` from `_locales/*/messages.json`
- Firefox icon interface: `manifest.firefox.ts` -> `icons/firefox-tomato-icon-*.png`
- Store copy sources: `docs/amo/*.md`
- Packaging: PowerShell + `System.IO.Compression` + Firefox `dist-firefox/`

---

Updated on 2026-06-08: repurposed this ExecPlan from the earlier store-readiness pass into the final 1.0.1 Firefox publication polish plan, because the user confirmed the current build version should stay 1.0.1 and requested SEO copy plus a stronger tomato-first brand pass before submission.

Updated on 2026-06-08: completed the branding pass with a generated `logo-master-firefox.png`, switched Firefox runtime assets to `firefox-tomato-icon-*`, and finished the AMO copy refresh for the unreleased 1.0.1 build.
