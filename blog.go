package main

import (
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"

	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

// Posts are formatted as unsigned integer .md
func blogNumbers(contentDir string) ([]int, error) {
	dir := filepath.Join(contentDir, "blog")
	info, err := os.Lstat(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fs.ErrNotExist
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var numbers []int
	for _, entry := range entries {
		name := entry.Name()
		n, err := strconv.Atoi(strings.TrimSuffix(name, ".md"))
		if err == nil && n > 0 && name == strconv.Itoa(n)+".md" && entry.Type().IsRegular() {
			numbers = append(numbers, n)
		}
	}
	sort.Ints(numbers)
	return numbers, nil
}

func serveBlog(w http.ResponseWriter, r *http.Request, contentDir, stem, canonical string) {
	numbers, err := blogNumbers(contentDir)
	if err != nil {
		serveError(w, r, err)
		return
	}
	var source []byte
	var navigation string
	if stem == "blog" {
		var index strings.Builder
		index.WriteString("[Home](/)\n\n# Blog\n\n")
		if len(numbers) == 0 {
			index.WriteString("No posts yet.\n")
		}
		for _, v := range slices.Backward(numbers) {
			post, err := readLocal(contentDir, fmt.Sprintf("blog/%d.md", v))
			if err != nil {
				serveError(w, r, err)
				return
			}
			var title string
			doc := md.Parser().Parse(text.NewReader(post))
			for node := doc.FirstChild(); node != nil; node = node.NextSibling() {
				if heading, ok := node.(*ast.Heading); ok && heading.Level == 1 {
					title = strings.TrimSpace(string(heading.Text(post)))
					break
				}
			}
			index.WriteString("- [")
			for i := 0; i < len(title); i++ {
				if util.IsPunct(title[i]) {
					index.WriteByte('\\')
				}
				index.WriteByte(title[i])
			}
			fmt.Fprintf(&index, "](/blog/%d/)\n", v)
		}
		source = []byte(index.String())
	} else {
		parts := strings.Split(strings.TrimPrefix(stem, "blog/"), "/")
		n, err := strconv.Atoi(parts[0])
		i := sort.SearchInts(numbers, n)
		if err != nil || parts[0] != strconv.Itoa(n) || i == len(numbers) || numbers[i] != n || len(parts) > 2 {
			http.NotFound(w, r)
			return
		}
		if len(parts) == 2 {
			switch parts[1] {
			case "prev":
				i--
			case "next":
				i++
			default:
				http.NotFound(w, r)
				return
			}
			target := "/blog/"
			if i >= 0 && i < len(numbers) {
				target = fmt.Sprintf("/blog/%d/", numbers[i])
			}
			// Temporary: adding a post can change the destination.
			http.Redirect(w, r, target, http.StatusFound)
			return
		}
		source, err = readLocal(contentDir, "blog/"+parts[0]+".md")
		if err != nil {
			serveError(w, r, err)
			return
		}
		navigation = `<hr><nav aria-label="Post navigation">`
		if i > 0 {
			navigation += fmt.Sprintf(`<a href="/blog/%d/prev/" rel="prev">Previous</a> · `, n)
		}
		navigation += `<a href="/blog/">All posts</a>`
		if i+1 < len(numbers) {
			navigation += fmt.Sprintf(` · <a href="/blog/%d/next/" rel="next">Next</a>`, n)
		}
		navigation += "</nav>\n"
	}
	if r.URL.Path != canonical {
		target := (&url.URL{Path: canonical, RawQuery: r.URL.RawQuery}).String()
		http.Redirect(w, r, target, http.StatusPermanentRedirect)
		return
	}
	data, err := renderMarkdown(source, navigation)
	if err != nil {
		serveError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	servePage(w, r, data)
}
