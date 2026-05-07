# QA Fix Status

The previously listed approval-dependent QA items have been resolved in source.

## Applied

- Added deployable social preview assets: `og-image.svg`, `og-platform.svg`, `og-services.svg`, and `og-cloud-config.svg`.
- Replaced missing nested service canonical URLs with live static routes: `/api-pentest`, `/llm-pentest`, and `/mobile-app-pentest`.
- Kept request access as a modal interaction and changed request-access triggers from links to buttons.
- Wrapped `mailto:` links with Cloudflare email-obfuscation opt-out comments.
- Replaced placeholder dates in `labs.html` and `exploit-registry.html`.
- Replaced sample `Acme` report copy with neutral demo copy.
- Standardized `CredShields` casing and US English wording where flagged.
- Removed the broken RealProton outbound link while keeping the logo visible.
- Removed public-launching/self-serve-coming-soon wording.

## Deployment Note

After deployment, verify Cloudflare still honors the email opt-out comments. If it continues rewriting email links to `/cdn-cgi/l/email-protection`, disable Email Address Obfuscation for this zone/page in Cloudflare.
