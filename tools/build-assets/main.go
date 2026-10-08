package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

func main() {
	if err := build("web"); err != nil {
		log.Fatal(err)
	}
}

func build(root string) error {
	type asset struct {
		name string
		data []byte
	}
	var assets []asset
	hash := sha256.New()
	err := filepath.WalkDir(root, func(filename string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if filename != root && (entry.Name() == "dist" || entry.Name() == "node_modules" || strings.HasPrefix(entry.Name(), ".")) {
				return filepath.SkipDir
			}
			return nil
		}
		if !entry.Type().IsRegular() {
			return fmt.Errorf("asset is not a regular file: %s", filename)
		}
		name, err := filepath.Rel(root, filename)
		if err != nil {
			return err
		}
		name = filepath.ToSlash(name)
		if strings.HasPrefix(entry.Name(), ".") || entry.Name() == "package.json" || entry.Name() == "package-lock.json" || name == "compress/vendor/cropper/entry.js" {
			return nil
		}
		data, err := os.ReadFile(filename)
		if err != nil {
			return err
		}
		ext := filepath.Ext(name)
		if !strings.Contains("/"+name, "/vendor/") && (ext == ".js" || ext == ".css") {
			loader := api.LoaderJS
			if ext == ".css" {
				loader = api.LoaderCSS
			}
			result := api.Transform(string(data), api.TransformOptions{
				Loader: loader, Sourcefile: name, Target: api.ES2020,
				MinifyWhitespace: true, MinifyIdentifiers: true, MinifySyntax: true,
				LegalComments: api.LegalCommentsInline,
			})
			if len(result.Errors) > 0 {
				return fmt.Errorf("minify %s: %s", name, result.Errors[0].Text)
			}
			data = result.Code
		}
		fmt.Fprintf(hash, "%s\x00%x\n", name, sha256.Sum256(data))
		assets = append(assets, asset{name, data})
		return nil
	})
	if err != nil {
		return err
	}
	version := fmt.Sprintf("%x", hash.Sum(nil))[:16]
	dist := filepath.Join(root, "dist")
	if err := os.RemoveAll(dist); err != nil {
		return err
	}
	for _, asset := range assets {
		filename := filepath.Join(dist, version, filepath.FromSlash(asset.name))
		if err := os.MkdirAll(filepath.Dir(filename), 0755); err != nil {
			return err
		}
		if err := os.WriteFile(filename, asset.data, 0644); err != nil {
			return err
		}
		switch filepath.Ext(asset.name) {
		case ".js", ".mjs", ".css":
			var buf bytes.Buffer
			zw, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
			if _, err := zw.Write(asset.data); err != nil {
				return err
			}
			if err := zw.Close(); err != nil {
				return err
			}
			if err := os.WriteFile(filename+".gz", buf.Bytes(), 0644); err != nil {
				return err
			}
		}
	}
	manifest, err := json.Marshal(struct {
		Version string `json:"version"`
	}{version})
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dist, "manifest.json"), manifest, 0644); err != nil {
		return err
	}
	fmt.Printf("built %d files in %s/%s \n", len(assets), dist, version)
	return nil
}
