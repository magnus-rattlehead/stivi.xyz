package main

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/yuin/goldmark"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

var md = goldmark.New(
	goldmark.WithExtensions(
		extension.Table,
		highlighting.NewHighlighting(highlighting.WithStyle("github")),
	),
	goldmark.WithParserOptions(parser.WithInlineParsers(util.Prioritized(mathParser{}, 199))),
	goldmark.WithRendererOptions(html.WithUnsafe()),
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	handler, err := newHandler("content", "web")
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func newHandler(contentDir, webDir string) (http.Handler, error) {
	assetPrefix, err := builtAssetPrefix(webDir)
	if err != nil {
		return nil, err
	}
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
		if asset, ok := strings.CutPrefix(name, "web/"); ok {
			immutable := assetPrefix != "/web/" && strings.HasPrefix(r.URL.Path, assetPrefix)
			serveAsset(w, r, webDir, asset, immutable)
			return
		}

		ext := path.Ext(name)
		if !strings.HasSuffix(name, "/") && ext != "" && ext != ".md" && ext != ".html" {
			serveAsset(w, r, contentDir, name, false)
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
		if stem == "blog" || strings.HasPrefix(stem, "blog/") {
			serveBlog(w, r, contentDir, stem, canonical, assetPrefix)
			return
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
				data, err = renderMarkdown(data, "")
				if err != nil {
					serveError(w, r, err)
					return
				}
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			servePage(w, r, data, assetPrefix)
			return
		}
		http.NotFound(w, r)
	}), nil
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

func serveAsset(w http.ResponseWriter, r *http.Request, root, name string, immutable bool) {
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
	cacheControl := "public, max-age=3600"
	if version := r.URL.Query().Get("v"); version != "" && !immutable {
		hash := sha256.New()
		if _, err := io.Copy(hash, file); err != nil {
			serveError(w, r, err)
			return
		}
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			serveError(w, r, err)
			return
		}
		digest := fmt.Sprintf("%x", hash.Sum(nil))
		w.Header().Set("ETag", `"`+digest+`"`)
		// Only matching content versions are safe to cache for a year.
		cacheControl = "no-cache"
		if version == digest[:16] {
			cacheControl = "public, max-age=31536000, immutable"
		}
	}
	if immutable {
		cacheControl = "public, max-age=31536000, immutable"
	}
	w.Header().Set("Cache-Control", cacheControl)
	if contentType := compressibleAssetType(name); contentType != "" {
		serveCompressedAsset(w, r, root, name, file, info.ModTime(), contentType, immutable)
		return
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func serveError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, fs.ErrNotExist) {
		http.NotFound(w, r)
		return
	}
	log.Printf("serve %s: %v", r.URL.Path, err)
	http.Error(w, "server error", http.StatusInternalServerError)
}

func renderMarkdown(source []byte, navigation string) ([]byte, error) {
	context := parser.NewContext()
	doc := md.Parser().Parse(text.NewReader(source), parser.WithContext(context))
	var buf bytes.Buffer
	buf.WriteString(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>stivi.xyz</title>
<style>
img { max-width: 100%; height: auto; }
pre {
  overflow-x: auto;
  padding: 1em;
  border-radius: 0.25em;
  background: #f6f8fa;
  font: 0.875rem/1.5 monospace;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
pre code { font: inherit; }
table { border-collapse: collapse; }
th, td { padding: 0.4em 0.75em; border-bottom: 1px solid #ccc; }
td { font-variant-numeric: tabular-nums; }
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.25em 0; }
</style>
`)
	if context.Get(mathContextKey) == true {
		buf.WriteString(mathAssets)
	}
	buf.WriteString("</head>\n<body>\n")
	if err := md.Renderer().Render(&buf, source, doc); err != nil {
		return nil, err
	}
	buf.WriteString(navigation)
	buf.WriteString("</body>\n</html>\n")
	return buf.Bytes(), nil
}
