package handler

import (
	"bytes"
	"html/template"
	"net/http"
	"os"

	"github.com/yuin/goldmark"
)

var (
	indexTmpl   *template.Template
	portfolioMD []byte
)

func init() {
	htmlBytes, err := os.ReadFile("web/index.html")
	if err != nil {
		panic(err)
	}
	indexTmpl = template.Must(template.New("index").Parse(string(htmlBytes)))

	portfolioMD, err = os.ReadFile("content/portfolio.md")
	if err != nil {
		panic(err)
	}
}

func Handler(w http.ResponseWriter, r *http.Request) {
	var buf bytes.Buffer
	if err := goldmark.Convert(portfolioMD, &buf); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	indexTmpl.Execute(w, template.HTML(buf.String()))
}
