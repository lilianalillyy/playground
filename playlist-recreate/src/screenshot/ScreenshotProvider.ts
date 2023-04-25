import { Provider } from "../providers/Provider.js";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import fs from "fs";
import { sync as glob } from "glob";
import { join } from "path";
import { google } from "@google-cloud/documentai/build/protos/protos.js";

export interface InternalTransform {
    title: string,
    author?: string
}

export class ScreenshotProvider implements Provider {
    private client: DocumentProcessorServiceClient;

    constructor(
        private imageDir: string,
        private processor: string,
    ) {
        this.client = new DocumentProcessorServiceClient();
    }

    public async provideList(): Promise<string[]> {
        let list: string[] = [];

        for (const path of glob(join(this.imageDir, "*.{jpg,png}"))) {
            list = [
                ...list,
                ...await this.transformImage(path)
            ];
        }

        return list;
    }

    async transformImage(path: string): Promise<string[]> {
        const [result] = await this.client.processDocument({
            name: this.processor,
            skipHumanReview: true,
            rawDocument: {
                content: Buffer.from(fs.readFileSync(path)).toString('base64'),
                mimeType: "image/jpeg",
            },
        })

        const isSong = (e: google.cloud.documentai.v1.Document.IEntity) => e.type === 'song';
        const isTitle = (e: google.cloud.documentai.v1.Document.IEntity) => e.type === 'title';
        const isAuthor = (e: google.cloud.documentai.v1.Document.IEntity) => e.type === 'author';

        const transformed = result?.document?.entities
            ?.filter(isSong)
            .filter(e => !!(e.properties?.find(isTitle)?.textAnchor?.content))
            .map(e => {
                // forcing the way here since it's already been filtered above
                const title = e.properties!.find(isTitle)!.textAnchor!.content;
                let author = e.properties!.find(isAuthor)?.textAnchor?.content;

                author = (!author || author.startsWith('Neznámý interpret')) ? null : author;

                return {
                    title,
                    author
                } as InternalTransform;
            })
            .map((t) => `${t.author ? `${t.author} - ` : ''}${t.title}`);


        return transformed as string[];
    }
}