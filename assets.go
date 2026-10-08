package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func builtAssetPrefix(webDir string) (string, error) {
	data, err := readLocal(webDir, "dist/manifest.json")
	if errors.Is(err, fs.ErrNotExist) {
		return "/web/", nil // An unbuilt checkout serves original sources.
	}
	if err != nil {
		return "", err
	}
	var manifest struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(data, &manifest); err != nil {
		return "", fmt.Errorf("asset manifest: %w", err)
	}
	if _, err := hex.DecodeString(manifest.Version); err != nil || len(manifest.Version) != 16 {
		return "", fmt.Errorf("invalid asset version %q", manifest.Version)
	}
	return "/web/dist/" + manifest.Version + "/", nil
}

func compressibleAssetType(name string) string {
	switch path.Ext(name) {
	case ".js", ".mjs":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	default:
		return ""
	}
}

// Explicit gzip preferences override a wildcard, including gzip;q=0.
func acceptsGzip(r *http.Request) bool {
	wildcard := false
	for _, encoding := range strings.Split(strings.Join(r.Header.Values("Accept-Encoding"), ","), ",") {
		parts := strings.Split(encoding, ";")
		name := strings.TrimSpace(parts[0])
		quality := 1.0
		for _, parameter := range parts[1:] {
			key, value, ok := strings.Cut(strings.TrimSpace(parameter), "=")
			if ok && strings.EqualFold(strings.TrimSpace(key), "q") {
				q, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
				quality = 0
				if err == nil && q >= 0 && q <= 1 {
					quality = q
				}
			}
		}
		if strings.EqualFold(name, "gzip") {
			return quality > 0
		}
		if name == "*" {
			wildcard = quality > 0
		}
	}
	return wildcard
}

func gzipBytes(data []byte) []byte {
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	_, _ = zw.Write(data)
	_ = zw.Close()
	return buf.Bytes()
}

func serveCompressedAsset(w http.ResponseWriter, r *http.Request, root, name string, file io.Reader, modTime time.Time, contentType string, precompressed bool) {
	w.Header().Set("Content-Type", contentType)
	w.Header().Add("Vary", "Accept-Encoding")
	var data []byte
	var err error
	compressed := acceptsGzip(r)
	if compressed && precompressed {
		data, err = readLocal(root, name+".gz")
	} else {
		data, err = io.ReadAll(file)
		if err == nil && compressed {
			data = gzipBytes(data)
		}
	}
	if err != nil {
		serveError(w, r, err)
		return
	}
	if compressed {
		w.Header().Set("Content-Encoding", "gzip")
	}
	// validate bytes sent
	w.Header().Set("ETag", fmt.Sprintf(`"%x"`, sha256.Sum256(data)))
	http.ServeContent(w, r, name, modTime, bytes.NewReader(data))
}

var assetAttribute = regexp.MustCompile(`\b(?:href|src|srcset|poster)\s*=\s*(?:"[^"]*"|'[^']*')`)
var assetURLStart = regexp.MustCompile(`(["'\s,])/web/`)

// Pages revalidate on each visit
func servePage(w http.ResponseWriter, r *http.Request, data []byte, assetPrefix string) {
	if assetPrefix != "/web/" {
		data = assetAttribute.ReplaceAllFunc(data, func(attribute []byte) []byte {
			return assetURLStart.ReplaceAll(attribute, []byte("${1}"+assetPrefix))
		})
	}
	w.Header().Add("Vary", "Accept-Encoding")
	if acceptsGzip(r) {
		data = gzipBytes(data)
		w.Header().Set("Content-Encoding", "gzip")
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%x"`, sha256.Sum256(data)))
	http.ServeContent(w, r, "", time.Time{}, bytes.NewReader(data))
}
