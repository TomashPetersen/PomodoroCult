## Purpose / Big Picture

Pomodoro Cult уже собран как отдельный Firefox-пакет, но для публикации в AMO ему нужен аккуратный публичный слой: узнаваемое лого, актуальные магазинные тексты, корректная privacy policy и воспроизводимые артефакты сборки. Пользовательский результат этой задачи простой: расширение должно выглядеть консистентно в браузере и в карточке AMO, а публикационный пакет должен быть готов к загрузке без ручной догадки по шагам.

## Progress

- [2026-05-10 10:34] Начал подготовку store-пакета, подтвердил отсутствие репозиторного `PLANS.md` и решил оформить отдельный ExecPlan для логотипа и AMO-материалов.
- [2026-05-10 10:35] Проверил текущие Firefox permission'ы (`storage`, `notifications`, `alarms`) и обнаружил, что privacy/listing docs еще описывают только `storage`.
- [2026-05-10 10:36] Подтвердил, что пользователь передал новый logo source PNG и что текущие иконки в `public/icons/` нужно заменить без смены путей в manifest-файлах.
- [2026-05-10 10:36] Импортировал пользовательский исходник в workspace как `assets/branding/source-logo.png`, чтобы иконки генерировались именно из присланного файла.
- [2026-05-10 10:39] In progress: генерация нового master logo asset и замена extension icon sizes из пользовательского PNG.
- [2026-05-10 21:08] Сгенерировал Firefox icon set из пользовательского PNG как `public/icons/firefox-icon-{16,32,48,128}.png` и переключил Firefox manifest/runtime на эти пути, чтобы не трогать Chrome-иконки.

## Surprises & Discoveries

- Русские версии `docs/privacy/index.md` и `docs/amo/listing.ru.md` сейчас сохранены в битой кодировке и требуют явной нормализации.
- Firefox runtime уже использует `notifications` и `alarms`, поэтому store/privacy-тексты должны это объяснять, иначе пакет будет выглядеть несогласованным на ревью.
- Notification icon в Firefox берется из `icons/icon-128.png`, так что новая иконка влияет не только на toolbar и listing, но и на системные уведомления.

## Decision Log

- Decision: не встраивать присланный PNG "как есть", а адаптировать его под extension icon через отдельный генератор.
  Reason: исходный файл содержит белый фон, пунктирную окружность и слишком много воздуха вокруг знака для маленьких размеров.
- Decision: для Firefox использовать отдельные имена `firefox-icon-16/32/48/128.png`, а Chrome-иконки не трогать.
  Reason: пользователь попросил готовить сейчас только Firefox-сборку, а существующие Chrome icon files были заблокированы локальной средой записи.
- Decision: документировать Firefox submission flow отдельным пошаговым checklist-файлом в репозитории.
  Reason: пользователь попросил подробную инструкцию по шагам и промо-материалам для выкладки в AMO.

## Outcomes & Retrospective

- Ожидаемый итог: новый набор иконок отражает бренд Pomodoro Cult и читается на маленьких размерах.
- Ожидаемый итог: Firefox listing docs, reviewer notes и privacy policy совпадают с фактическим поведением сборки.
- Ожидаемый итог: в репозитории есть готовый checklist для AMO со списком обязательных материалов и шагов загрузки.

## Context and Orientation

Файлы и модули, которые здесь важны:

- `public/icons/`: исходные PNG-иконки расширения для Chrome и Firefox.
- `manifest.json`: Chrome manifest, использует те же icon paths.
- `manifest.firefox.ts`: Firefox manifest, использует те же icon paths и Firefox-specific permissions.
- `src/background-firefox.ts`: Firefox runtime, использует `icons/icon-128.png` в системных уведомлениях.
- `docs/amo/listing.en.md`: английский store listing copy.
- `docs/amo/listing.ru.md`: русский store listing copy.
- `docs/amo/reviewer-note.md`: заметка для AMO reviewer.
- `docs/amo/source-submission.md`: build/source submission instructions.
- `docs/privacy/index.md`: privacy policy для GitHub Pages.
- `FIREFOX.md`: локальная памятка по Firefox build/package flow.

## Plan of Work

1. Подготовить reproducible logo generation flow и сгенерировать чистый master asset.
2. Заменить extension icons без смены manifest paths.
3. Обновить Firefox store docs под реальные permissions и background behavior.
4. Добавить пошаговую инструкцию по выкладке и промо-материалам.
5. Собрать Chrome и Firefox артефакты, затем подготовить `.xpi` и source archive.

## Concrete Steps

1. Создать скрипт генерации иконок, который берет пользовательский PNG, очищает фон/пунктир и экспортирует `16/32/48/128`.
2. Сгенерировать `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` и сохранить master asset для дальнейших правок.
3. Проверить, что `manifest.json`, `manifest.firefox.ts` и `src/background-firefox.ts` не требуют path changes.
4. Исправить privacy policy и listing docs на нормальный UTF-8 и дописать explanation для `notifications` и `alarms`.
5. Добавить новый checklist-документ по AMO submission: шаги, поля карточки, promo materials, screenshots, итоговая проверка.
6. Выполнить `npm.cmd run build` и `npm.cmd run build:firefox`.
7. Упаковать `dist-firefox/` в `.xpi` и собрать source archive с build instructions.

## Validation and Acceptance

Команды для проверки:

```powershell
npm.cmd run build
npm.cmd run build:firefox
```

Acceptance checks:

- `public/icons/` содержит новый набор PNG, а manifest-пути не менялись.
- `dist/icons/` и `dist-firefox/icons/` отражают новое лого.
- `docs/privacy/index.md` и `docs/amo/*.md` описывают `storage`, `notifications`, `alarms` и не содержат битой кодировки.
- В репозитории есть пошаговый Firefox submission checklist.
- Firefox package можно собрать в `.xpi`, а source archive сопровождается build instructions.

## Idempotence and Recovery

- Если новый логотип на 16px окажется нечитаемым, упростить внутренние детали, не меняя основную форму бренда.
- Если AMO docs снова разойдутся с кодом, считать `manifest.firefox.ts` и `src/background-firefox.ts` источником истины по permissions/runtime behavior.
- Если packaging flow сломается, сохранить `dist-firefox/` как source of truth и отдельно перепроверить команды из `FIREFOX.md`.

## Artifacts and Notes

- Планируемые новые/обновленные артефакты:
  - `public/icons/icon-16.png`
  - `public/icons/icon-32.png`
  - `public/icons/icon-48.png`
  - `public/icons/icon-128.png`
  - `assets/branding/logo-master.png`
  - `scripts/generate-extension-icons.ps1`
  - `docs/amo/submission-checklist.md`
- Build artifacts после завершения:
  - `dist-firefox/`
  - `artifacts/pomodoro-cult-firefox.xpi`
  - `artifacts/pomodoro-cult-firefox-source.zip`

## Interfaces and Dependencies

- Browser-facing icon interface: `manifest.json`, `manifest.firefox.ts`, `chrome.runtime.getURL('icons/icon-128.png')`
- Store-facing docs: `docs/amo/*`, `docs/privacy/index.md`
- Local build dependencies: `npm.cmd`, `tsc`, `vite`

---

Updated on 2026-05-10: created a dedicated ExecPlan for logo replacement and Firefox store readiness because the task crosses branding assets, Firefox packaging, and publication documentation.

Updated on 2026-05-10: recorded that the repository now uses the user-provided `source-logo.png` as the source asset for icon generation instead of a synthetic redraw.
