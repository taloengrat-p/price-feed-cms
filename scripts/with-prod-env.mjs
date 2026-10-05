import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.production");
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "wealth-sphere-prod") {
  throw new Error("Production build requires the wealth-sphere-prod Firebase project");
}
if (process.env.NEXT_PUBLIC_API_URL !== "https://price-feed-api-prod-fglrllx3jq-as.a.run.app") {
  throw new Error("Production build requires the Cloud Run production API base URL");
}
const command = process.argv[2];
if (command !== "dev" && command !== "build") {
  throw new Error("Expected dev or build");
}
const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", command, ...process.argv.slice(3)], {
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
