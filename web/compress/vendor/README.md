# Vendored codecs

Upstream license texts are included in each dependency directory.

| Dependency | Version | Files retained | Source distribution |
| --- | --- | --- | --- |
| Mediabunny | 1.60.0 | `dist/bundles/mediabunny.min.mjs`, `LICENSE` | https://registry.npmjs.org/mediabunny/-/mediabunny-1.60.0.tgz |
| @jsquash/avif | 2.1.1 | `encode.js`, `meta.js`, `utils.js`, `codec/enc/avif_enc.js`, `codec/enc/avif_enc.wasm`, `LICENSE` | https://registry.npmjs.org/@jsquash/avif/-/avif-2.1.1.tgz |
| heic-to | 1.5.2 | `dist/next/heic-to.js`, `LICENSE` | https://registry.npmjs.org/heic-to/-/heic-to-1.5.2.tgz |

Mediabunny is MPL-2.0; its source is included in its npm distribution and is also
available at https://github.com/Vanilagy/mediabunny. The browser bundle is unmodified.

jSquash is Apache-2.0 and uses libavif/libaom. Its source and codec build instructions
are available at https://github.com/jamsinclair/jSquash and
https://github.com/GoogleChromeLabs/squoosh. Native codec sources are available at
https://github.com/AOMediaCodec/libavif and https://aomedia.googlesource.com/aom/.

heic-to is LGPL-3.0 and includes its libheif/libde265 decoder inside the distributed
JavaScript.https://github.com/hoppergee/heic-to,
https://github.com/strukturag/libheif/tree/v1.22.2, and
https://github.com/strukturag/libde265. Consult those projects for the native
decoder license notices and corresponding source. The original distribution
includes the wrapper source and build script.
