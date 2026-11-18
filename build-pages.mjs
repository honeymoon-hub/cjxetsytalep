import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const basePath = "/cjxetsytalep";
const apiOrigin = "https://talep-masasi-17.limitlesscoyote8.chatgpt.site";
const template = await readFile("worker/index.html", "utf8");
const page = template
  .replace("<!-- STYLES -->", '<link rel="stylesheet" href="' + basePath + '/style.css">')
  .replace(
    "<!-- SCRIPT -->",
    '<script>window.TICKET_API_ORIGIN = ' + JSON.stringify(apiOrigin) + ';</script>' +
      '<script src="' + basePath + '/client.js" defer></script>',
  );

await mkdir("docs", { recursive: true });
await Promise.all([
  writeFile("docs/index.html", page),
  copyFile("worker/style.css", "docs/style.css"),
  copyFile("worker/client.js", "docs/client.js"),
  writeFile("docs/.nojekyll", ""),
]);
