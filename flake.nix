{
  description = "Jernerics ML experiment dashboard";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    bun2nix = {
      url = "github:nix-community/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs:
    let
      inherit (inputs.nixpkgs) lib;
      forAllSystems = lib.genAttrs lib.systems.flakeExposed;
      pkgsFor = forAllSystems (
        system:
        import inputs.nixpkgs {
          inherit system;
          overlays = [ inputs.bun2nix.overlays.default ];
        }
      );
    in
    let
      playwrightChromium = forAllSystems (
        system: pkgsFor.${system}.callPackage ./nix/playwright-chromium.nix { }
      );
    in
    {
      devShells = forAllSystems (system: {
        default = pkgsFor.${system}.mkShell {
          packages = with pkgsFor.${system}; [
            bun
            bun2nix
            just
            typescript
            (python3.withPackages (ps: with ps; [
              fastapi
              uvicorn
            ]))
          ];

          shellHook = ''
            echo "jernerics-dashboard dev shell"
            echo "bun $(bun --version)"
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Playwright on NixOS
            export PLAYWRIGHT_BROWSERS_PATH=${playwrightChromium.${system}}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          '';
        };
      });

      packages = forAllSystems (system: {
        default = pkgsFor.${system}.callPackage ./default.nix { };
      });
    };
}
