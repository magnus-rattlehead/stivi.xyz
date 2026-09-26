# Vendored codecs

These files are served from the same origin. No dependency is fetched from a CDN
at runtime. Upstream license texts are included in each dependency directory.

| Dependency | Version | Files retained | Source distribution |
| --- | --- | --- | --- |
| Mediabunny | 1.60.0 | `dist/bundles/mediabunny.min.mjs`, `LICENSE` | https://registry.npmjs.org/mediabunny/-/mediabunny-1.60.0.tgz |
| @jsquash/avif | 2.1.1 | `encode.js`, `meta.js`, `utils.js`, `codec/enc/avif_enc.js`, `codec/enc/avif_enc.wasm`, `LICENSE` | https://registry.npmjs.org/@jsquash/avif/-/avif-2.1.1.tgz |
| heic-to | 1.5.2 | `dist/next/heic-to.js`, `LICENSE` | https://registry.npmjs.org/heic-to/-/heic-to-1.5.2.tgz |

Mediabunny is MPL-2.0; its source is included in its npm distribution and is also
available at https://github.com/Vanilagy/mediabunny. The browser bundle is unmodified.

jSquash is Apache-2.0 and uses libavif/libaom. Its source and codec build instructions
are available at https://github.com/jamsinclair/jSquash (the npm tarball above is
the authoritative distributed version) and
https://github.com/GoogleChromeLabs/squoosh. Native codec sources are available at
https://github.com/AOMediaCodec/libavif and https://aomedia.googlesource.com/aom/.

The local `avif/encode.js` has one intentional adaptation: remove the
`wasm-feature-detect` import, the Node/Cloudflare environment helpers, and the
multithreaded branch inside `init`. Always initialize `codec/enc/avif_enc.js`.
This eliminates the feature-detection dependency and multithreaded assets. The
modification is marked in that file; encoding behavior and defaults are otherwise
upstream. Run it inside our worker, not on the main thread.

heic-to is LGPL-3.0 and includes its libheif/libde265 decoder inside the distributed
JavaScript. The worker-compatible `next` build is copied without modification.
Sources and build instructions: https://github.com/hoppergee/heic-to,
https://github.com/strukturag/libheif/tree/v1.22.2, and
https://github.com/strukturag/libde265. Consult those projects for the native
decoder license notices and corresponding source. The original distribution
includes the wrapper source and build script.

## Updating

1. Choose explicit package versions and download their npm tarballs to a temporary
   directory with `curl -fL`. Extract each with `tar -xzf`; npm packages extract
   under a `package/` directory. Do not run package install hooks or build scripts.
2. Copy only the files listed above into the corresponding local directories.
   Rename Mediabunny's bundle to `mediabunny/mediabunny.min.mjs` and heic-to's
   `dist/next/heic-to.js` to `heic-to/heic-to.js`. Keep license files alongside them.
3. Reapply the documented single-threaded adaptation to `avif/encode.js`. Retain
   the relative `codec/enc/` layout because the encoder resolves its WASM asset
   relative to the JavaScript module.
4. Update the version table, source links, and native-code license notices as
   needed. No application build step is required.
5. Leave validation to the user, per this project's implementation instructions.
