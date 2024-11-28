default:
	nix develop -c bash -c "make iwsds2025.pdf"

clean:
	nix develop -c bash -c "latexmk -c iwsds2025.tex"

%.pdf: %.tex
	latexmk -pdflatex --shell-escape $<

%.tex: %.org
	emacs  --batch $< -f org-latex-export-to-latex --kill
