import { 
    apiKey, 
    clientId, 
    Migrator, 
    playlistDescription, 
    playlistPrivacy, 
    playlistTitle, 
    processor, 
    staticTitleFilter, 
    staticVideoIds 
} from "../src/Migrator.js";
import { rootDir } from "../src/constants.js";
import { ScreenshotProvider } from "../src/providers/ScreenshotProvider.js";
import path from "path";

new Migrator(
    new ScreenshotProvider(
        //path.join(rootDir, "..", "images"),
        path.join(rootDir, "..", "playlist"),
        processor
    ),
    apiKey,
    clientId,
    playlistTitle,
    playlistDescription,
    playlistPrivacy,
    staticVideoIds,
    staticTitleFilter
).run()