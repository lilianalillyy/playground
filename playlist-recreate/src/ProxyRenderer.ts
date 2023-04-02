import fs from "fs";
import { join } from "path";
import http from "http";
import open from "open";
import { host, port } from "./Migrator.js";
import { rootDir } from "./constants.js";

export class ProxyRenderer {
    static async serveAndOpenTemplate(args: Record<string, any>): Promise<void> {
        const server = http.createServer((req, res) => {
            if (req.url === '/shutdown') {
                server.close();
            }

            res.writeHead(200, { 
                "Content-Type": "text/html",
                "Access-Control-Allow-Origin": "*"
            });
            res.end(ProxyRenderer.renderTemplateToHtml(args), "utf-8");
        }).listen(port, host);

        await open(`http://${host}:${port}`);
    }

    static renderTemplateToHtml(args: Record<string, any>): string {
        let rendered = fs.readFileSync(join(rootDir, "template.html"), "utf-8")
        if (!rendered) return "";

        for (const key of Object.keys(args)) {
            rendered = rendered.replace(`{{${key}}}`, args[key]);
        }

        return rendered;
    }
}