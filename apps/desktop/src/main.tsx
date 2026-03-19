import "./globals.css";
import { bootstrapApp } from "./app/bootstrap";
import { logFrontendEvent } from "./shared/lib/frontendLogger";

logFrontendEvent("frontend_app", "ready", {
  mode: "react_strict",
});

bootstrapApp();
