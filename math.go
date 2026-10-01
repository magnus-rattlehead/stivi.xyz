package main

import (
	"bytes"
	"html"

	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
)

var mathContextKey = parser.NewContextKey()

// Preserve TeX before Markdown interprets its backslashes and underscores.
// Only matched $...$ and $$...$$ expressions are passed to KaTeX.
type mathParser struct{}

func (mathParser) Trigger() []byte { return []byte{'$'} }

func (mathParser) Parse(_ ast.Node, reader text.Reader, context parser.Context) ast.Node {
	line, _ := reader.PeekLine()
	size := 1
	if len(line) > 1 && line[1] == '$' {
		size = 2
	}
	if len(line) > size && line[size] == '$' {
		return nil
	}
	if size == 1 && (len(line) == 1 || isMathSpace(line[1])) {
		return nil
	}
	startLine, startPosition := reader.Position()
	delimiter := bytes.Repeat([]byte{'$'}, size)
	var expression bytes.Buffer
	expression.Write(delimiter)
	reader.Advance(size)
	for {
		line, _ = reader.PeekLine()
		if line == nil {
			reader.SetPosition(startLine, startPosition)
			return nil
		}
		for i := 0; i < len(line); i++ {
			if line[i] == '\\' {
				i++ // An escaped dollar is part of the TeX expression.
				continue
			}
			if line[i] != '$' {
				continue
			}
			end := i
			for end < len(line) && line[end] == '$' {
				end++
			}
			if end-i != size || (size == 1 && (i == 0 || isMathSpace(line[i-1]))) {
				i = end - 1
				continue
			}
			expression.Write(line[:end])
			reader.Advance(end)
			node := ast.NewString([]byte(`<span class="math">` + html.EscapeString(expression.String()) + `</span>`))
			node.SetCode(true) // The wrapper is fixed and its contents are HTML-escaped.
			context.Set(mathContextKey, true)
			return node
		}
		expression.Write(line)
		reader.AdvanceLine()
	}
}

func isMathSpace(b byte) bool { return b == ' ' || b == '\t' || b == '\n' || b == '\r' }

// Pinned assets and integrity hashes from https://katex.org/docs/autorender.html.
// Restrict rendering to parsed math so escaped dollars and code stay literal.
const mathAssets = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.9/dist/katex.min.css" integrity="sha384-lPx0C4zIUZLpveABMwOFcFeGZwsvKBJfhJ85FN1PYOV7xApBcFMhcAEMVKF8loOI" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.18.9/dist/katex.min.js" integrity="sha384-19KE2cFb3U+RUWmyhBz7aLOGDG8WrRC6hE3oY/HTZZlAAVWYTdmvLC//+TIV3zUx" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.18.9/dist/contrib/auto-render.min.js" integrity="sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz" crossorigin="anonymous" onload="document.querySelectorAll('.math').forEach(function(element) { renderMathInElement(element, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false}); });"></script>
`
