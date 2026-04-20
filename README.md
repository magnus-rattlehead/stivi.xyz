# stivi.xyz

Personal portfolio site. Built with Go and vanilla JS.

## Stack

- **Go** — HTTP server, serves the portfolio page rendered from Markdown
- **Goldmark** — Markdown → HTML
- **JS** — cat behavior (cursor-reactive state machine)

## Development

```bash
go run .
# open http://localhost:8080
```

## Structure

```
content/portfolio.md   # page content (edit this)
web/
  index.html           # page template
  style.css
  cat.js               # cat behavior
  assets/cat/          # directional walk GIFs
main.go                # HTTP server
```

## Deployment

```bash
docker build -t stivi.xyz .
docker run -p 8080:8080 stivi.xyz
```
