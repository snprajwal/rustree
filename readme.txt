explore rust csts, entirely in your browser. syntax elements
are extracted using the rust-analyzer/syntax crate, and
exposed to js via wasm.


build:

    $ nix shell
    $ wasm-pack build
    $ cd www && npm run build


run:

    $ xdg-open www/dist/index.html


try it out at https://cstea.peppe.rs
