<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1dc_adBc8whrg514py1_3t1mMX7cQIvUy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Automated Windows builds

- The workflow at [.github/workflows/windows-build.yml](.github/workflows/windows-build.yml) now uses Electron Forge on `windows-latest` runners to produce the Windows installer.
- Forge output lives under `out/make/...`; the workflow uploads everything under that folder as the `atiempo-windows` artifact.
- Tagging a commit with `v*` triggers a publish step (`npm run publish:win`) that drafts a GitHub Release using the generated Squirrel installer.
- To build locally on Windows, run `npm ci` then `npm run make:win`. Publish with a `GITHUB_TOKEN` in your environment via `npm run publish:win`.
