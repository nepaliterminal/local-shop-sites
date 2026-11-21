# Local listing photographs

These are the reproducible source assets for the real demo pages. `node build.js` copies referenced files to `docs/<slug>/img/`; generated output is never their only copy.

Source: the `photos` arrays in the supplied `/home/ubuntu/shops.json` Google Maps export. Each business JSON preserves its exact `maps_url` listing link. The original export is not needed to rebuild and is not committed. Downloaded using `curl -fLsS`, visually inspected, EXIF-oriented, resized to fit 1600 × 1600, and JPEG-compressed at quality 85. No Google photos are hotlinked by the real demos.

Indices below are zero-based positions in that supplied export, in the order used for `photo-1.jpg`, `photo-2.jpg`, etc.:

| Slug | Source photo indices | Kept |
| --- | --- | --- |
| master-auto | 5, 6, 3, 4, 8 | 5 |
| chefs-doner | 3, 4 | 2 |
| salon-angel | 3, 4 | 2 |
| merrifield-tailor | 3, 4 | 2 |
| silk-road-grill | 3, 4 | 2 |
| rolling-burrito | 3, 4 | 2 |

The first three entries for most businesses were reviewer avatars, including letter tiles, portraits, and unrelated scenes. Master Auto indices 5 and 7 were byte-identical; only 5 was kept. Its index 9 showed an unrelated restaurant. None of these unsuitable images were included just to meet an image count. Five businesses therefore have fewer than the requested three photos; additional owner-supplied photographs are needed to reach that count honestly.

These are unofficial demo assets, not a claim of ownership. Public availability on Maps is not a license; verify ownership, permission, and attribution requirements with the business and photographer before a public production launch. Remove or replace any photo on request.
