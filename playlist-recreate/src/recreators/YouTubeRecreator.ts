import axios from "axios";
import chalk from "chalk";
import fs from "fs";
import inquirer, { createPromptModule } from "inquirer";
import { join } from "path";
import { Provider } from "../providers/Provider.js";
import { Spinner } from "../../../swisk/src/cli/Spinner.js";
import { rootDir } from "../constants.js";
import { AbstractRecreator } from "./AbstractRecreator.js";
import { StatePersistor } from "../utils/StatePersistor.js";

const watchUrlRegex =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

export interface SearchItem {
  id: { videoId: string };
  snippet: { channelTitle: string; title: string };
}

export interface SearchResponse {
  items: SearchItem[];
  nextPageToken?: string;
  prevPageToken?: string;
}

export class YouTubeRecreator extends AbstractRecreator {
  private currentKey: number = 0;
  private noUsableKey: boolean = false;

  private prompt = createPromptModule();

  constructor(
    provider: Provider,
    forceYes: boolean,
    private ytApiKeys: string[],
    private ytFrontApiKey: string,
    private ytClientId: string,
    private playlistTitle: string,
    private playlistDescription: string,
    private playlistPrivacy: string,
    private staticVideoIds: string[] = [],
    private staticTitleFilter: string[] = []
  ) {
    super(provider, forceYes);
  }

  private async loadFromProvider(): Promise<string[]> {
    let titles = await Spinner.promise(
      this.provider.provideList(),
      "Requesting a list from a provider..."
    );

    // static filter
    titles = titles.filter(
      (title) =>
        !this.staticTitleFilter.some(
          (filter) => title.toLowerCase() === filter.toLowerCase()
        )
    );

    if (!this.forceYes) {
      titles = (
        await this.prompt<{ titles: string[] }>({
          type: "checkbox",
          name: "titles",
          message: "Select valid titles",
          choices: titles.map((title, i) => ({
            name: title,
            value: title,
            enabled: true,
            indicator: `${i + 1}#`,
          })),
        })
      ).titles;
    }

    return titles;
  }

  private async loadFromTemplist(): Promise<string[]> {
    try {
      return fs
        .readFileSync("templist.txt", "utf-8")
        .split(", ")
        .filter(
          (title) =>
            !this.staticTitleFilter.some(
              (filter) => title.toLowerCase() === filter.toLowerCase()
            )
        );
    } catch {
      return [];
    }
  }

  private async getVideoForTitle(
    title: string,
    pageToken?: string
  ): Promise<string | null> {
    if (this.noUsableKey) {
      return null;
    }

    try {
      const data = (
        await Spinner.promise(
          axios.request<SearchResponse>({
            url: "https://www.googleapis.com/youtube/v3/search",
            params: {
              q: title,
              type: "video",
              key: this.ytApiKeys[this.currentKey],
              part: "id,snippet",
              relevanceLanguage: "en-US",
              maxResults: 20,
              ...(pageToken ? { pageToken } : {}),
            },
          }),
          `Searching youtube for ${chalk.underline(title)}`
        )
      ).data;

      if (!data || data.items.length < 1) {
        console.log(chalk.red(`No result found for ${chalk.underline(title)}`));
        return null;
      }

      const item = this.forceYes
        ? data.items[0]
        : (
            await this.prompt<{
              item: "own" | "next" | "prev" | null | SearchItem;
            }>({
              type: "list",
              name: "item",
              loop: false,
              message: chalk.underline(title),
              choices: [
                ...Sort.levenSortObjectArray(
                  data.items.map((item) => ({
                    name: `${chalk.gray(
                      `https://youtube.com/watch?v=${item.id.videoId}`
                    )} ${chalk.green(
                      item.snippet?.title ?? ""
                    )} by ${chalk.yellow(item.snippet?.channelTitle)}`,
                    value: item,
                    title: item.snippet?.title ?? "",
                  })),
                  "title",
                  title
                ),
                new inquirer.Separator(),
                ...(data.nextPageToken
                  ? [
                      {
                        name: chalk.green("Next page"),
                        value: "next",
                      },
                    ]
                  : []),
                ...(data.prevPageToken
                  ? [
                      {
                        name: chalk.yellow("Previous page"),
                        value: "prev",
                      },
                    ]
                  : []),
                {
                  name: chalk.blue("Own entry"),
                  value: "own",
                },
                {
                  name: chalk.gray("Skip this title"),
                  value: null,
                },
              ],
            })
          ).item;

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
        let videoId = (
          await this.prompt<{ own: string }>({
            name: "own",
            type: "input",
            message: "Enter your custom URL",
            validate: async (value: string) => {
              const matches = watchUrlRegex.exec(value);
              if (!matches || matches.length < 6) return "Invalid URL given";

              const videoId = matches[5];

              try {
                const data = (
                  await Spinner.promise(
                    axios.request({
                      url: "https://www.googleapis.com/youtube/v3/videos",
                      params: {
                        id: videoId,
                        key: this.ytApiKeys[this.currentKey],
                        part: "id,snippet",
                      },
                    }),
                    `Looking up ${chalk.underline(`${videoId}`)}`
                  )
                ).data;

                if (!data || data.items.length !== 1) {
                  return `Cannot find a video by id ${chalk.underline(
                    videoId
                  )}`;
                }

                const item = data.items[0];

                console.log(
                  chalk.greenBright(
                    `${chalk.underline(
                      item.snippet?.title
                    )} by ${chalk.underline(item.snippet?.channelTitle)}`
                  )
                );

                return true;
              } catch (err) {
                return chalk.red((err as any)?.message);
              }
            },
          })
        ).own;

        // ! as it already passed validation
        return watchUrlRegex.exec(videoId)![5];
      }

      console.log(
        `${chalk.yellow(title)} -> ${chalk.green(
          `https://youtube.com/watch?v=${item.id.videoId}`
        )}`
      );

      return item.id.videoId as string;
    } catch (error) {
      const e = error as any;
      if (e.response) {
        const data = e.response.data;
        if (
          data?.error?.errors[0] &&
          data?.error?.errors[0].reason === "quotaExceeded"
        ) {
          console.log(chalk.red(`Quota filled for apiKey[${this.currentKey}]`));

          const nextKey = this.currentKey + 1;

          if (this.ytApiKeys.length <= nextKey) {
            this.noUsableKey = true;
            return null;
          }

          this.currentKey = nextKey;
          console.log(chalk.yellow(`Retrying with apiKey[${nextKey}]`));

          return await this.getVideoForTitle(title, pageToken);
        }
      }

      throw error;
    }
  }

  public async run(): Promise<void> {
    const shouldTemplist =
      fs.existsSync("templist.txt") &&
      (
        await this.prompt<{ load: boolean }>({
          type: "confirm",
          name: "load",
          message: "templist.txt found, should i recover?",
        })
      ).load;

    let titles = await (shouldTemplist
      ? this.loadFromTemplist()
      : this.loadFromProvider());

    if (titles.length < 1) {
      console.log(chalk.red.underline("No titles found..."));
      return;
    }

    let videoIds = (
      await titles.mapAsync(async (title) => {
        const result = await this.getVideoForTitle(title);
        
        if (result) {
            StatePersistor.persist("youtube", {
                url: result,
                query: title
            });
        }

        return result;
      })
    ).filter((val) => !!val) as string[];

    videoIds.push(...this.staticVideoIds);

    // unique
    videoIds = videoIds.filter((id, idx, ids) => idx == ids.indexOf(id));

    if (this.noUsableKey) {
      console.log(
        chalk.red(
          "At some point there was no usable API key for resolving videos, so the playlist is not complete"
        )
      );
    }

    console.log(
      `${videoIds.length} entries mapped.. (titles.length=${titles.length})`
    );

    await this.serve("youtube", {
      video_ids: JSON.stringify(videoIds),
      api_key: this.ytFrontApiKey,
      client_id: this.ytClientId,
      playlist_title: this.playlistTitle,
      playlist_description: this.playlistDescription,
      playlist_privacy: this.playlistPrivacy,
    });
  }
}

const {
  apiKeys,
  frontApiKey,
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
  maxResults = 20,
}: Record<string, any> = JSON.parse(
  fs.readFileSync(join(rootDir, "..", "config.json"), "utf-8")
);

export {
  apiKeys,
  frontApiKey,
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
  maxResults,
};
