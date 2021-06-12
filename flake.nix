{
  inputs = {
    utils.url = "github:numtide/flake-utils";
    naersk.url = "github:nmattia/naersk";
    mozillapkgs = {
      url = "github:andersk/nixpkgs-mozilla/stdenv.lib";
      flake = false;
    };
    gitignore = {
      url = "github:hercules-ci/gitignore";
      flake = false;
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, utils, naersk, mozillapkgs, gitignore, ... }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages."${system}";
        lib = pkgs.lib;
        stdenv = pkgs.stdenv;
        darwin = pkgs.darwin;
        inherit (import gitignore { inherit (pkgs) lib; }) gitignoreSource;

        # Get a specific rust version
        mozilla = pkgs.callPackage (mozillapkgs + "/package-set.nix") { };
        chanspec = {
          date = "2021-03-31";
          channel = "nightly";
          sha256 = "oK5ebje09MRn988saJMT3Zze/tRE7u9zTeFPV1CEeLc="; # set zeros after modifying channel or date
        };

        rustChannel = mozilla.rustChannelOf chanspec;
        rust = rustChannel.rust.override {
          targets = [ "wasm32-unknown-unknown" ];
          extensions = [ ];
        };
        rust-src = rustChannel.rust-src;

        naersk-lib = naersk.lib."${system}".override {
          cargo = rust;
          rustc = rust;
        };

        nativeBuildInputs = with pkgs; [
          nixUnstable
        ];

        buildInputs = pkgs.lib.optionals pkgs.stdenv.isDarwin [
          darwin.apple_sdk.frameworks.Security
          darwin.libiconv
        ];

      in
      rec {
        packages.cstea = naersk-lib.buildPackage {
          pname = "cstea";
          version = "0.1.0";
          root = gitignoreSource ./.;
          inherit nativeBuildInputs buildInputs;
        };
        defaultPackage = packages.cstea;
        apps.cstea = utils.lib.mkApp {
          drv = packages.cstea;
        };
        apps.check = {
          type = "app";
          program = "${pkgs.cargo-watch}/bin/cargo-watch";
        };
        defaultApp = apps.cstea;
        devShell = pkgs.mkShell {
          nativeBuildInputs = nativeBuildInputs ++ [
            rust
            rust-src
            pkgs.rust-analyzer
            pkgs.rustfmt
            pkgs.cargo
            pkgs.cargo-watch

            pkgs.miniserve
            pkgs.wasm-pack
            pkgs.cargo-generate
            pkgs.nodePackages.npm
            pkgs.nodejs
          ];
          inherit buildInputs;
          RUST_SRC_PATH = "${rust-src}/lib/rustlib/src/rust/library";
          RUST_LOG = "info";
          RUST_BACKTRACE = 1;
        };
      });
}
