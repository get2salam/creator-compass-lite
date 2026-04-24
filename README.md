# Creator Compass Lite

Steer creative projects with visible priorities, friction, and momentum.

![Creator Compass Lite preview](docs/preview.svg)

Creator Compass Lite is a small local-first planning tool for solo builders, operators, and creative teams who want a cleaner way to manage projects. Add items, score the signal, track the friction, and keep the strongest opportunities visible without needing a backend or build step.

## Features

- Local-first persistence with `localStorage`
- Search and filter controls
- Ranked list sorted by signal minus friction
- Inline editor for title, notes, type, status, score, and effort
- Import/export JSON backups
- Re-seed action for resetting the sample board
- Keyboard shortcuts: `N` for new, `/` for search
- No build tooling, just open in a browser

## Quick start

```bash
git clone https://github.com/<you>/creator-compass-lite.git
cd creator-compass-lite
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Data shape

```json
{
  "boardTitle": "Creator compass",
  "items": [
    {
      "title": "Founder operating essay",
      "category": "Writing",
      "state": "Building",
      "score": 8,
      "effort": 4
    }
  ]
}
```

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
