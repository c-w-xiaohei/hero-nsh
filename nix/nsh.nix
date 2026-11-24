# Package the prebuilt Native Shell (longbridge/nsh) release. Nothing here
# compiles Rust: the release archive already holds `bin/nsh` and this
# machine's runtime, and the web archive adds `runtime/web` plus
# `components/web.json`.
#
# The CLI locates `runtime/` and `components/` relative to `bin/nsh`, so both
# archives are unpacked into one distribution root.
#
# This is the CI artifact. `runtime/linux` (the GTK4 host and Linux app
# runner) is removed on Linux: no CI lane runs a Linux desktop window, and
# keeping it would pull GTK4, WebKitGTK and GStreamer into the closure.
{ pkgs }:
let
  inherit (pkgs) lib stdenvNoCC;

  version = "0.6.0";

  releases = {
    x86_64-linux = {
      asset = "nsh-linux-x86_64.tar.gz";
      hash = "sha256-GdNg643RuohHo7OtBggvbzcF6wSugXg1eoza0xiA8Nk=";
    };
    aarch64-linux = {
      asset = "nsh-linux-arm64.tar.gz";
      hash = "sha256-3GQmwVLqYAM3RRr8Ho6BUxgjMJlRvjXN49kZKO6qc3k=";
    };
    aarch64-darwin = {
      asset = "nsh-macos-arm64.tar.gz";
      hash = "sha256-sqg3DItEymBZ0thmW0iwhHKk/uOVaBO5kiP0485Ukdk=";
    };
  };

  release =
    releases.${pkgs.stdenv.hostPlatform.system}
      or (throw "nsh ${version} has no release for ${pkgs.stdenv.hostPlatform.system}");

  releaseUrl = "https://github.com/longbridge/nsh/releases/download/v${version}";
in
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "nsh";
  inherit version;

  srcs = [
    (pkgs.fetchurl {
      url = "${releaseUrl}/${release.asset}";
      inherit (release) hash;
    })
    (pkgs.fetchurl {
      url = "${releaseUrl}/nsh-web.tar.gz";
      hash = "sha256-oalyzyDA0qLZzFT6stf9YHUEGyaSmIa/uNeOKZLDsyQ=";
    })
  ];

  nativeBuildInputs = lib.optionals pkgs.stdenv.hostPlatform.isLinux [
    pkgs.autoPatchelfHook
  ];

  buildInputs = lib.optionals pkgs.stdenv.hostPlatform.isLinux [
    pkgs.stdenv.cc.cc.lib
  ];

  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    # unpackPhase sets sourceRoot to the archives' shared `nsh/`, so this
    # phase already runs inside the distribution root.
    cp -r . "$out/"

    ${lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
      rm -rf "$out/runtime/linux"
    ''}

    install -Dm644 "$out/LICENSE-APACHE" "$out/share/licenses/nsh/LICENSE-APACHE"

    runHook postInstall
  '';

  meta = {
    description = "Native Shell (NSH) CLI and web runtime";
    homepage = "https://nsh.dev/";
    license = lib.licenses.asl20;
    platforms = builtins.attrNames releases;
    mainProgram = "nsh";
    sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
  };
})
