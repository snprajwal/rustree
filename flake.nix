{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    naersk = {
      url = "github:nix-community/naersk";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    gitignore = {
      url = "github:hercules-ci/gitignore";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, naersk, gitignore, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        inherit (import gitignore { inherit (pkgs) lib; }) gitignoreSource;

        # Use the latest stable Rust
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
          targets = [ "wasm32-unknown-unknown" ];
        };

        naersk-lib = naersk.lib.${system}.override {
          cargo = rustToolchain;
          rustc = rustToolchain;
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
        packages.rustree = naersk-lib.buildPackage {
          pname = "rustree";
          version = "0.1.0";
          root = gitignoreSource ./.;
          inherit nativeBuildInputs buildInputs;
        };

        defaultPackage = packages.rustree;

        apps.rustree = flake-utils.lib.mkApp {
          drv = packages.rustree;
        };

        apps.check = {
          type = "app";
          program = "${pkgs.cargo-watch}/bin/cargo-watch";
        };

        defaultApp = apps.rustree;

        devShell = pkgs.mkShell {
          buildInputs = buildInputs ++ [
            rustToolchain
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

          inherit nativeBuildInputs;
          
          RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";
          RUST_LOG = "info";
          RUST_BACKTRACE = "1";
        };
      });
}
