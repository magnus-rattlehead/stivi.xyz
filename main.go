package main

import (
	"bytes"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/yuin/goldmark"
)

var md = goldmark.New()

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, newHandler("content", "web")))
}

func newHandler(contentDir, webDir string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name != "" && !validName(strings.TrimSuffix(name, "/")) {
			http.NotFound(w, r)
			return
		}
		if name == "web" {
			http.NotFound(w, r)
			return
		}
		if strings.HasPrefix(name, "web/") {
			serveAsset(w, r, webDir, strings.TrimPrefix(name, "web/"))
			return
		}

		ext := path.Ext(name)
		if !strings.HasSuffix(name, "/") && ext != "" && ext != ".md" && ext != ".html" {
			serveAsset(w, r, contentDir, name)
			return
		}
		stem := strings.TrimSuffix(name, "/")
		if ext == ".md" || ext == ".html" {
			stem = strings.TrimSuffix(stem, ext)
		}
		canonical := "/" + stem + "/"
		if stem == "" || stem == "index" {
			stem, canonical = "index", "/"
		}
		for _, extension := range []string{".html", ".md"} {
			filename := stem + extension
			data, err := readLocal(contentDir, filename)
			if errors.Is(err, fs.ErrNotExist) {
				continue
			}
			if err != nil {
				serveError(w, r, err)
				return
			}
			if r.URL.Path != canonical {
				target := (&url.URL{Path: canonical, RawQuery: r.URL.RawQuery}).String()
				http.Redirect(w, r, target, http.StatusPermanentRedirect)
				return
			}
			if extension == ".md" {
				data, err = renderMarkdown(data)
				if err != nil {
					serveError(w, r, err)
					return
				}
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			if r.Method != http.MethodHead {
				if _, err := w.Write(data); err != nil {
					log.Printf("write page: %v", err)
				}
			}
			return
		}
		http.NotFound(w, r)
	})
}

func validName(name string) bool {
	return fs.ValidPath(name) && name != "." && !strings.ContainsAny(name, "\\\x00")
}

func localPath(root, name string) (string, error) {
	if !validName(name) {
		return "", fs.ErrNotExist
	}
	filename := root
	parts := strings.Split(name, "/")
	for i, part := range parts {
		filename = filepath.Join(filename, part)
		info, err := os.Lstat(filename)
		if err != nil {
			return "", err
		}
		if info.Mode()&os.ModeSymlink != 0 || (i < len(parts)-1 && !info.IsDir()) || (i == len(parts)-1 && !info.Mode().IsRegular()) {
			return "", fs.ErrNotExist
		}
	}
	return filename, nil
}

func readLocal(root, name string) ([]byte, error) {
	filename, err := localPath(root, name)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(filename)
}

func serveAsset(w http.ResponseWriter, r *http.Request, root, name string) {
	filename, err := localPath(root, name)
	if err != nil {
		serveError(w, r, err)
		return
	}
	file, err := os.Open(filename)
	if err != nil {
		serveError(w, r, err)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		serveError(w, r, err)
		return
	}
	http.ServeContent(w, r, info.Name(), time.Time{}, file)
}

func serveError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, fs.ErrNotExist) {
		http.NotFound(w, r)
		return
	}
	log.Printf("serve %s: %v", r.URL.Path, err)
	http.Error(w, "server error", http.StatusInternalServerError)
}

func renderMarkdown(source []byte) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteString(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>stivi.xyz</title>
</head>
<body>
`)
	if err := md.Convert(source, &buf); err != nil {
		return nil, err
	}
	buf.WriteString("</body>\n</html>\n")
	return buf.Bytes(), nil
}
