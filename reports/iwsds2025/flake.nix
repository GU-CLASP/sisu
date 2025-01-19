# edited from https://flyx.org/nix-flakes-latex/

{
  description = "Reproducible LaTeX Document";

  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs/nixos-24.05;
    flake-utils.url = github:numtide/flake-utils;
  };

  outputs = { self, nixpkgs, flake-utils }:
    with flake-utils.lib; eachSystem allSystems (system:
    let

      # do not include ".tex"
      documentName = "main";

      pkgs = nixpkgs.legacyPackages.${system};


      # use this to get everything
      # tex = pkgs.texlive.combined.scheme-full;

      myEmacsConfig = pkgs.writeText "default.el" ''
      (org-babel-do-load-languages
        'org-babel-load-languages
        '((plantuml . t)))
      (setq org-plantuml-exec-mode 'plantuml
         org-plantuml-args '("-headless"))
      (setq org-confirm-babel-evaluate nil)
      (setq org-export-with-smart-quotes t)
     '';


      # use this and add what you need for a lighter load on your nix store
      tex = pkgs.texlive.combine {
        inherit (pkgs.texlive) scheme-small latexmk
          psnfss
          helvetic
          booktabs
          courier
          caption
          siunitx
          url
          inconsolata
          lipsum  
          tipa
          enumitem
          hyperref
          biblatex
          biblatex-ieee
          biber
          glossaries
          eqparbox
          environ
          
          # for emacs latex
          wrapfig
          capt-of
          svg
          catchfile
          transparent
        ;
      };

    in rec {
      devShell = pkgs.mkShell {
        buildInputs = [ pkgs.coreutils tex pkgs.gzip pkgs.perl pkgs.emacs pkgs.plantuml pkgs.imagemagick pkgs.inkscape pkgs.git
                        pkgs.inconsolata-nerdfont
                        ];
        shellHook = ''
               export MYEMACSLOAD=${myEmacsConfig}
          '';
        };
    }
    );
}
