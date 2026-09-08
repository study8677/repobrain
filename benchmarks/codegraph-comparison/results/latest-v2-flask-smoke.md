# Latest-v2 Flask unrestricted-native smoke

This is a one-question harness smoke, not a publishable product-wide result.

## Pins

- RepoBrain: `5ed6d06ded999ec4e689af97f1a9625520f00547`
- CodeGraph: `1.6.0` (`dfccdf62547fcd76d343344d823a0e1998d3a89f`)
- Flask: `3.1.3` (`22d924701a6ae2e4cd01e9a15bbaf3946094af65`)
- Requested model: `Seed-2.1-Turbo`
- Observed model route: `Seed-2.1-Turbo -> seed-code-pro`
- Track: `unrestricted_native`; both agents could inspect the pinned source.

## Result

Question: `flask-request-dispatch`

| Metric | RepoBrain | CodeGraph + Trae |
|---|---:|---:|
| Completed | yes | yes |
| Evidence atoms | 6/6 | 6/6 |
| Wall time | 52.89 s | 79.95 s |
| Input tokens | 181,320 | 221,084 |
| Cached input tokens | 146,656 | 209,344 |
| Output tokens | 2,566 | 3,126 |
| Reported total tokens | 183,886 | 224,210 |
| Monetary cost | unavailable | unavailable |

The expected file and five expected lifecycle symbols were present in both
answers. A manual check against the pinned `src/flask/app.py` confirmed the
reported `wsgi_app -> full_dispatch_request -> preprocess_request /
dispatch_request -> finalize_request` flow. This validates the harness only;
the formal suite still requires all questions and three repetitions.

RepoBrain's public full refresh produced and promoted an active Flask
generation in 489.75 seconds. CodeGraph made eight CodeGraph CLI calls and
three other agent commands during its unrestricted answer run. No command
budget applies in this track.
