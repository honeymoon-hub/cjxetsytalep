import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
const [html, css, client, server] = await Promise.all(
  ["index.html", "style.css", "client.js", "index.js"].map(file => readFile("worker/" + file, "utf8"))
);
const page = html.replace("<!-- STYLES -->", () => "<style>" + css + "</style>")
  .replace("<!-- SCRIPT -->", () => "<script>" + client + "</script>");
await writeFile("dist/server/index.js", "const PAGE = " + JSON.stringify(page) + ";\n" + server);
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
