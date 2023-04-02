import "./array/index.js";
import { Provider } from "./providers/Provider.js";
import { join } from "path";
import axios, { AxiosResponse } from "axios";
import chalk from "chalk";
import { Spinner } from "./Spinner.js";
import { ProxyRenderer } from "./ProxyRenderer.js";
import {createPromptModule} from "inquirer";
import fs from "fs";
import { rootDir, ytWatchUrlRegex } from "./constants.js";
import inquirer from "inquirer";
// @ts-ignore
import sort from "leven-sort"

export const prompt = createPromptModule();

export class Migrator {
    constructor(
        private provider: Provider,
        private ytApiKey: string,
        private ytClientId: string,
        private playlistTitle: string,
        private playlistDescription: string,
        private playlistPrivacy: string,
        private staticVideoIds: string[] = [],
        private staticTitleFilter: string[] = [],
        private forceYes: boolean = false,
    ) {
    }

    private async loadFromProvider(): Promise<string[]> {
        let titles = await Spinner.promise(this.provider.provideList(), 'Requesting a list from a provider...');

        // static filter
        titles = titles.filter(
            (title) => !this.staticTitleFilter.some((filter) => title.toLowerCase() === filter.toLowerCase())
        )

        if (!this.forceYes) {
            titles = (await prompt<{ titles: string[] }>({
                type: 'checkbox',
                name: 'titles',
                message: 'Select valid titles',
                choices: titles.map((title, i) => ({ name: title, value: title, enabled: true, indicator: `${i+1}#` }))
            })).titles;
        }

        return titles;
    }

    private async loadFromTemplist(): Promise<string[]> {
        try {
            return fs.readFileSync("templist.txt", "utf-8").split(", ");
        } catch {
            return []
        }
    }

    private async getVideoForTitle(title: string, pageToken?: string): Promise<string|null> {
        const data = (await Spinner.promise<AxiosResponse<any>, Promise<AxiosResponse<any>>>(
            axios.request({
                url: "https://www.googleapis.com/youtube/v3/search",
                params: {
                    q: title,
                    type: "video",
                    key: this.ytApiKey,
                    part: 'id,snippet',
                    relevanceLanguage: 'en-US',
                    maxResults: 20,
                    ...pageToken ? { pageToken } : {}
                }
            }),
            `Searching youtube for ${chalk.underline(title)}`
        )).data;

        if (!data || data.items.length < 1) {
            console.log(chalk.red(`No result found for ${chalk.underline(title)}`));
            return null;
        }

        const item = this.forceYes ? data.items[0] : (await prompt<{item: string}>({
            type: 'list',
            name: 'item',
            loop: false,
            message: chalk.underline(title),
            choices: [
                ...sort(data.items.map((item: any) => ({
                    name: `${chalk.gray(`https://youtube.com/watch?v=${item.id.videoId}`)} ${chalk.green(item.snippet?.title)} by ${chalk.yellow(item.snippet?.channelTitle)}`,
                    value: item,
                })), title, 'name'),
                new inquirer.Separator(),
                ...data.nextPageToken ? [
                    {
                        name: chalk.green("Next page"),
                        value: "next"
                    },
                ] : [],
                ...data.prevPageToken ? [
                    {
                        name: chalk.yellow("Previous page"),
                        value: "prev"
                    },
                ] : [],
                {
                    name: chalk.blue("Own entry"),
                    value: "own"
                },
                {
                    name: chalk.gray("Skip this title"),
                    value: null
                }
            ],
        })).item;

        if (!item) {
            return null;
        }

        if (item === "prev") {
            return this.getVideoForTitle(title, data.prevPageToken);
        }

        if (item === "next") {
            return this.getVideoForTitle(title, data.nextPageToken);
        }

        if (item === "own") {
            let videoId = (await prompt<{own: string}>({
                name: "own",
                type: "input",
                message: "Enter your custom URL",
                validate: async (value: string) => {
                    const matches = ytWatchUrlRegex.exec(value);
                    if (!matches || matches.length < 6) return "Invalid URL given";

                    const videoId = matches[5];

                    try {
                        const data = (await Spinner.promise<AxiosResponse<any>, Promise<AxiosResponse<any>>>(
                            axios.request({
                                url: "https://www.googleapis.com/youtube/v3/videos",
                                params: {
                                    id: videoId,
                                    key: this.ytApiKey,
                                    part: 'id,snippet',
                                }
                            }),
                            `Looking up ${chalk.underline(`${videoId}`)}`
                        )).data;
                
                        if (!data || data.items.length !== 1) {
                            return `Cannot find a video by id ${chalk.underline(videoId)}`;
                        }

                        const item = data.items[0];

                        console.log(chalk.greenBright(`${chalk.underline(item.snippet?.title)} by ${chalk.underline(item.snippet?.channelTitle)}`))

                        return true
                    } catch (err) {
                        return chalk.red((err as any)?.message);
                    }
                }
            })).own;

            // ! as it already passed validation
            return ytWatchUrlRegex.exec(videoId)![5];
        }

        console.log(`${chalk.yellow(title)} -> ${chalk.green(`https://youtube.com/watch?v=${item.id.videoId}`)}`)

        return item.id.videoId as string;
    }

    public async run(): Promise<void> {
        const shouldTemplist = fs.existsSync("templist.txt") && (await prompt<{ load: boolean }>({
            type: "confirm",
            name: "load",
            message: "templist.txt found, should i recover?"
        })).load;

        let titles = await (shouldTemplist ? this.loadFromTemplist() : this.loadFromProvider());

        if (titles.length < 1) {
            console.log(chalk.red.underline("No titles found..."))
            return;
        }

        let videoIds = (await titles.mapAsync(async (title) => await this.getVideoForTitle(title)))
            .filter(val => !!val) as string[];

        videoIds.push(...this.staticVideoIds);

        // unique
        videoIds = videoIds.filter((id, idx, ids) => idx == ids.indexOf(id));

        await ProxyRenderer.serveAndOpenTemplate({
            video_ids: JSON.stringify(videoIds),
            api_key: this.ytApiKey,
            client_id: this.ytClientId,
            playlist_title: this.playlistTitle,
            playlist_description: this.playlistDescription,
            playlist_privacy: this.playlistPrivacy,
        });
    }
}

const {
    apiKey,
    clientId,
    processor,
    playlistTitle = "PlaylistMigrated",
    playlistDescription = "",
    playlistPrivacy = "private",
    staticVideoIds = [],
    staticTitleFilter = [],
    forceYes = true,
    port = 3300,
    host = "localhost",
    maxResults = 20
}: Record<string, any> = JSON.parse(
    fs.readFileSync(join(rootDir, "..", "config.json"), "utf-8")
);

export {
    apiKey,
    clientId,
    processor,
    playlistTitle,
    playlistDescription,
    playlistPrivacy,
    staticVideoIds,
    staticTitleFilter,
    forceYes,
    port,
    host,
    maxResults
}