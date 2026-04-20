package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	resend "github.com/resend/resend-go/v2"
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
	mux.HandleFunc("POST /api/contact", handleContact)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Message) == "" {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		http.Error(w, "email not configured", http.StatusInternalServerError)
		return
	}

	client := resend.NewClient(apiKey)
	_, err := client.Emails.Send(&resend.SendEmailRequest{
		From:    "contact@stivi.xyz",
		To:      []string{"guranjakustivi@gmail.com"},
		Subject: "Message from stivi.xyz",
		Text:    body.Message,
	})
	if err != nil {
		log.Printf("resend error: %v", err)
		http.Error(w, "failed to send", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
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
