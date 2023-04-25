import "../../swisk/src/polyfills.js";
import { 
    apiKeys, 
    frontApiKey,
    clientId, 
    forceYes, 
    YouTubeRecreator, 
    playlistDescription, 
    playlistPrivacy, 
    playlistTitle, 
    processor, 
    staticTitleFilter, 
    staticVideoIds 
} from "../src/recreators/YouTubeRecreator.js";
import { rootDir } from "../src/constants.js";
import { ScreenshotProvider } from "../src/screenshot/ScreenshotProvider.js";
import path from "path";

new YouTubeRecreator(
    new ScreenshotProvider(
        //path.join(rootDir, "..", "images"),
        path.join(rootDir, "..", "playlist"),
        processor
    ),
    forceYes,
    apiKeys,
    frontApiKey,
    clientId,
    playlistTitle,
    playlistDescription,
    playlistPrivacy,
    staticVideoIds,
    staticTitleFilter
).run()