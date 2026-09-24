# Verification notes

Checked on 24 September 2026 against this portfolio snapshot.

| Check | Command | Result |
|---|---|---|
| Locked dependency install | `npm ci` | Passed; 14 packages installed, npm audit reported 0 vulnerabilities |
| Unit tests | `npm test` | Passed: 60 tests, 0 failures |
| Frozen fixture discovery | `npm run eval:c -- --list` | Passed: 3 example fixtures and T01–T20 listed |
| Production build | `npm run build -- --configLoader runner` | Passed: 25 modules transformed and `dist/` generated |
| Local startup | `npm run dev -- --host 127.0.0.1 --configLoader runner` | Passed: HTTP 200 and page title `FreshLoop · AI 食材管理` |
| JSON parse | Python standard-library parse of frozen suite and public manifest | Passed |
| Secret/private-path scan | Pattern scan over public text files | Passed for private absolute paths, private-key headers, common API-token prefixes, and GitHub token prefixes |
| Live demo | Opened `https://fresh-loop-liard.vercel.app/` | Reachable; onboarding/user-notice page rendered |

The default Vite config loader attempted to inspect a sandbox-blocked parent directory in the Codex workspace. Vite's supported `--configLoader runner` mode bypassed config bundling and completed both build and startup. This is an environment-specific verification workaround; the application source was not changed for it.

The production build output and `node_modules/` were removed after verification and remain ignored by Git.

## Not executed

- No new DeepSeek-backed T01–T20 run: no project credential was used, and a paid/provider-backed rerun was not necessary to verify the portfolio edits.
- No Supabase OTP/profile synchronization, Twilio SMS, or scheduled reminder delivery: these require external project credentials and service configuration.
- No new manual A/B/C rescoring: the original A/B outputs and a controlled common T03 asset were not available as a complete reproducible bundle.
