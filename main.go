package main

import (
	"bytes"
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/renderer/html"
)

//go:embed web
var webFS embed.FS

//go:embed content/portfolio.md
var portfolioMD []byte

var md = goldmark.New(goldmark.WithRendererOptions(html.WithUnsafe()))

var indexTmpl = template.Must(func() (*template.Template, error) {
	b, err := webFS.ReadFile("web/index.html")
	if err != nil {
		panic(err)
	}
	return template.New("index").Parse(string(b))
}())

func main() {
	staticFS, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /web/", http.StripPrefix("/web/", http.FileServer(http.FS(staticFS))))
	mux.HandleFunc("GET /", handleIndex)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	var buf bytes.Buffer
	if err := md.Convert(portfolioMD, &buf); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	indexTmpl.Execute(w, template.HTML(buf.String()))
}
