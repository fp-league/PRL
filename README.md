# PRL — Premier Racing League

F1 26 league website. Orange / black / white.

## Pages
Home · Standings · Transfers · News · Teams · Drivers · Calendar · Results · Admin (passcode)

## Files
- `index.html` – page shell and navigation
- `style.css` – all styling
- `app.js` – pages, standings engine, admin panel
- `data.json` – **all league data** (teams, drivers, calendar, results, news, transfers). Updated automatically by the Admin page.
- `assets/logo.png` – drop the league logo here and it replaces the text badge automatically

## Updating the site
Open the site → 🔒 Admin → passcode. The first time on each device, paste a GitHub fine-grained token
(owner **fp-league**, repo **prl**, *Contents: Read and write*). After that every change is committed
to `data.json` automatically and visitors see it straight away.

## Hosting (GitHub Pages)
Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root → Save.
