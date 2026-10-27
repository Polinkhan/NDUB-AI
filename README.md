# NDUB AI Assistant

An authenticated AI assistant for the NDUB student portal. It uses NVIDIA NIM for streamed tool-calling responses, the student portal APIs for personal academic data, and Tavily for public web search.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add your NVIDIA and Tavily API keys and a tool-capable NVIDIA model ID.
3. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:5050](http://localhost:5050). Students sign in with their existing NDUB portal credentials.

## Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

Portal credentials are never stored. Access and refresh tokens use secure HTTP-only cookies, while conversation history stays in the current browser tab's session storage and is cleared on logout.

## Standalone production build

`npm run build` creates a deployable server in `.next/standalone` and copies the required static assets into it. Environment files and secrets are not copied into the artifact.

Run the standalone server with runtime environment variables available:

```bash
HOSTNAME=0.0.0.0 npm run start
```

To deploy only the artifact, copy `.next/standalone` to the server and run `node server.js` from that directory. Configure the variables documented in `.env.example` through the hosting platform or process environment, and use HTTPS in production so secure authentication cookies work correctly.

## GitHub Actions deployment

The workflow in `.github/workflows/deploy.yml` tests, lints, builds, and deploys the standalone application to EC2 whenever `main` is updated. It runs the application with PM2 on port `5050` and restores the previous release if the health check fails.

Configure these GitHub repository secrets:

- `EC2_HOST`: EC2 hostname or IP address
- `EC2_USER`: SSH username
- `EC2_SSH_KEY`: private SSH key
- `APP_DIR`: absolute deployment parent directory, such as `/home/ubuntu/apps`
- `APP_ENV`: the complete contents of the production `.env` file

On EC2, install Node.js 22, PM2, and `curl`. The workflow securely writes `APP_ENV` to `${APP_DIR}/ndub-ai.env`, keeps it outside the application release, and links it at runtime. It is never included in the standalone application archive or printed in the workflow logs.
