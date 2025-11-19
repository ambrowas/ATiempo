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

- The workflow at [.github/workflows/windows-build.yml](.github/workflows/windows-build.yml) runs on every push or pull request targeting `main`, tags that start with `v`, or via `Run workflow` in GitHub's UI.
- It executes `npm ci` followed by `npm run dist:win` on a Windows runner, producing the NSIS installer and other distributables under `release/`.
- Download `atiempo-windows` from the workflow run's *Artifacts* section to get the generated `.exe` (and accompanying `.zip`/`.blockmap`) files.
