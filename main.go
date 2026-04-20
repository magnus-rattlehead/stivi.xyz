package main

import (
	"bytes"
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/yuin/goldmark"
)

var indexTmpl *template.Template

func main() {
	var err error
	indexTmpl, err = template.ParseFiles("web/index.html")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /web/", http.StripPrefix("/web/", http.FileServer(http.Dir("web"))))
	mux.HandleFunc("GET /", handleIndex)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	md, err := os.ReadFile("content/portfolio.md")
	if err != nil {
		http.Error(w, "content not found", http.StatusInternalServerError)
		return
	}
	var buf bytes.Buffer
	if err := goldmark.Convert(md, &buf); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	indexTmpl.Execute(w, template.HTML(buf.String()))
}
