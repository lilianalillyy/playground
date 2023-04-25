import { frontApiKey, clientId, playlistDescription, playlistPrivacy, playlistTitle, staticVideoIds } from "../src/recreators/YouTubeRecreator.js";
import { Frontend } from "../src/frontend/Frontend.js";

new Frontend("youtube", {
    video_ids: JSON.stringify(staticVideoIds),
    api_key: frontApiKey,
    client_id: clientId,
    playlist_title: playlistTitle,
    playlist_description: playlistDescription,
    playlist_privacy: playlistPrivacy,
}).serve()