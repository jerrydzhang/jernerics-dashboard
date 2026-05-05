# Build-time theming via base16 scheme injected from NixOS config

The dashboard bakes its color scheme into the Vite build as a Nix derivation parameter, rather than loading themes at runtime or hardcoding colors. The base16 scheme comes from the user's Stylix config and is mapped to shadcn CSS custom properties at build time. Chart palettes derive from the scheme's accent colors. Changing the theme requires a NixOS rebuild — consistent with how Stylix already works for every other themed application. Runtime theme switching is not supported.
