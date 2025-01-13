default:
	nix develop --ignore-environment -c bash -c "make iwsds2025.pdf"

clean:
	nix develop -c bash -c "latexmk -c iwsds2025.tex"

%.pdf: %.tex
	latexmk -pdflatex --shell-escape $<

%.tex: %.org
	emacs --eval="(load \"${MYEMACSLOAD}\")" --batch $< -f org-latex-export-to-latex --kill
