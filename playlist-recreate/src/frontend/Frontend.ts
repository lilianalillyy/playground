import fs from "fs";
import { join } from "path";
import http from "http";
import open from "open";
import { host, port } from "../recreators/YouTubeRecreator.js";
import { rootDir } from "../constants.js";

/**
 * A frontend that processes the results. 
 */
export class Frontend {
    constructor(
        private html: string, 
        private args: Record<string, any>
    ) {
    }

    public async serve(): Promise<void> {
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 
                "Content-Type": "text/html",
                "Access-Control-Allow-Origin": "*"
            });
            
            /**
             * The frontend includes one endpoint (more of a hook/call), and that is "/shutdown".
             * It's called once the frontend operations are completed.
             */
            if (req.url === '/shutdown') {
                server.close();
                return;
            }

            res.end(this.renderTemplateToHtml(), "utf-8");
        }).listen(port, host);

        await open(`http://${host}:${port}`);
    }

    private renderTemplateToHtml(): string {
        let rendered = fs.readFileSync(join(rootDir, `html`, `${this.html}.html`), "utf-8")
        if (!rendered) return "";

        for (const key of Object.keys(this.args)) {
            rendered = rendered.replace(`{{${key}}}`, this.args[key]);
        }

        return rendered;
    }
}