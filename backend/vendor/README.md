# PDF runtime bundles

- pdf-lib 1.17.1, npm distribution `dist/pdf-lib.min.js`, MIT; license in PDF-LIB-LICENSE.md.
- @pdf-lib/fontkit 1.1.1, npm distribution `dist/fontkit.umd.min.js`, MIT; upstream attribution and license link in FONTKIT-README.md, package metadata in FONTKIT-PACKAGE.json.
- Bundles are pinned and used server-side without network calls or a build-time npm install.
- Roboto static instances for PDF are generated from Google Fonts ofl/roboto/Roboto[wdth,wght].ttf at wght=400/700, wdth=100. Font license: frontend/assets/fonts/ROBOTO-LICENSE.txt.
