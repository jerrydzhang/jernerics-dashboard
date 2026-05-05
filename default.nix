{ stdenv, bun2nix, ... }:
stdenv.mkDerivation {
  pname = "jernerics-dashboard";
  version = "0.1.0";

  src = ./.;

  nativeBuildInputs = [
    bun2nix.hook
  ];

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  buildPhase = ''
    bun run build
  '';

  installPhase = ''
    cp -R ./dist $out
  '';
}
