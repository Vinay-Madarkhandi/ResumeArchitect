# ResumeArchitect Job Clipper

Build the Manifest V3 archive with `npm run build:extension`. The output is `dist/resumearchitect-job-clipper.zip`.

- **Chrome 123 or newer**. Unzip the archive, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the directory containing `manifest.json`.
- **Firefox 128 or newer**. For local testing, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select the archive. Temporary add-ons are removed when Firefox exits. Permanent Firefox distribution requires a Mozilla-signed package.

Open the extension’s **Settings** and copy its **Extension origin**. Set `CLIPPER_EXTENSION_ORIGINS` on your ResumeArchitect server to that exact value, then restart the web app. Separate multiple installations with commas. The origin may change when you reinstall the extension or use a different browser profile.

In ResumeArchitect, open **Settings → Personal API tokens** and create a named token. Copy it into the extension along with your server’s HTTPS origin and choose **Verify and save**. HTTP works for local development at `localhost` or `127.0.0.1`. The browser asks for access to that host. The extension stores credentials in local extension storage and only reads a posting when you open its popup. Review the extracted fields, then select **Save to tracker**.

The API accepts bearer tokens for `GET /api/v1/me` and `POST /api/v1/jobs`. A clip requires a title and accepts company, location, salary, URL, and description. Browser CORS is limited to the configured extension origins. Requests without an Origin header, including command-line requests, still require a valid token.
