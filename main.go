package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"errors"
	"fmt"
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
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

var md = goldmark.New(
	goldmark.WithExtensions(
		extension.Table,
		highlighting.NewHighlighting(highlighting.WithStyle("github")),
	),
	goldmark.WithParserOptions(parser.WithInlineParsers(util.Prioritized(mathParser{}, 199))),
)

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
		if asset, ok := strings.CutPrefix(name, "web/"); ok {
			serveAsset(w, r, webDir, asset)
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
		if stem == "blog" || strings.HasPrefix(stem, "blog/") {
			serveBlog(w, r, contentDir, stem, canonical)
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
			servePage(w, r, data)
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
	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

// Pages revalidate on each visit; compressed and plain responses have distinct validators.
func servePage(w http.ResponseWriter, r *http.Request, data []byte) {
	w.Header().Add("Vary", "Accept-Encoding")
	for _, encoding := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		// Only accept an unqualified gzip token; quality-weighted requests can use plain HTML.
		if strings.TrimSpace(encoding) == "gzip" {
			var buf bytes.Buffer
			zw := gzip.NewWriter(&buf)
			_, _ = zw.Write(data)
			_ = zw.Close()
			data = buf.Bytes()
			w.Header().Set("Content-Encoding", "gzip")
			break
		}
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%x"`, sha256.Sum256(data)))
	http.ServeContent(w, r, "", time.Time{}, bytes.NewReader(data))
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
pre { overflow-x: auto; padding: 1em; border-radius: 0.25em; background: #f6f8fa; }
pre code { font-size: inherit; }
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
	_ = ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		img, ok := node.(*ast.Image)
		if ok && entering && string(img.Destination) == "/web/assets/static/about-960.webp" {
			// Reserve image space and defer fetching it.
			for _, attr := range [][2]string{
				{"loading", "lazy"}, {"decoding", "async"}, {"width", "1920"}, {"height", "1440"},
				{"srcset", "/web/assets/static/about-480.webp 480w, /web/assets/static/about-960.webp 960w, /web/assets/static/about-1920.webp 1920w"},
				{"sizes", "(max-width: 1936px) calc(100vw - 16px), 1920px"},
			} {
				img.SetAttributeString(attr[0], []byte(attr[1]))
			}
		}
		return ast.WalkContinue, nil
	})
	if err := md.Renderer().Render(&buf, source, doc); err != nil {
		return nil, err
	}
	buf.WriteString(navigation)
	buf.WriteString("</body>\n</html>\n")
	return buf.Bytes(), nil
}
