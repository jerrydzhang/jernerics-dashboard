{ pkgs }:

let
  fontconfig = pkgs.makeFontsConf { fontDirectories = [ ]; };

  isAarch64 = pkgs.stdenv.hostPlatform.isAarch64;

  # Playwright expects different directory names per arch
  # See: EXECUTABLE_PATHS in playwright-core/lib/server/registry/index.js
  chromiumDir = if isAarch64 then "chrome-linux" else "chrome-linux64";
  headlessDir =
    if isAarch64 then "chrome-linux" else "chrome-headless-shell-linux64";
  headlessBin = if isAarch64 then "headless_shell" else "chrome-headless-shell";
in
pkgs.runCommand "playwright-browsers-chromium"
  {
    nativeBuildInputs = [
      pkgs.makeWrapper
    ];
  }
  ''
    mkdir -p $out/chromium-1217/${chromiumDir}
    mkdir -p $out/chromium_headless_shell-1217/${headlessDir}

    makeWrapper ${pkgs.chromium}/bin/chromium $out/chromium-1217/${chromiumDir}/chrome \
      --set SSL_CERT_FILE /etc/ssl/certs/ca-bundle.crt \
      --set FONTCONFIG_FILE ${fontconfig}

    makeWrapper ${pkgs.chromium}/bin/chromium $out/chromium_headless_shell-1217/${headlessDir}/${headlessBin} \
      --set SSL_CERT_FILE /etc/ssl/certs/ca-bundle.crt \
      --set FONTCONFIG_FILE ${fontconfig}
  ''
