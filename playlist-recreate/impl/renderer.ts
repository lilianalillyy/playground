import { apiKey, clientId, playlistDescription, playlistPrivacy, playlistTitle, staticVideoIds } from "../src/Migrator.js";
import { ProxyRenderer } from "../src/ProxyRenderer.js";

ProxyRenderer.serveAndOpenTemplate({
    video_ids: JSON.stringify(staticVideoIds),
    api_key: apiKey,
    client_id: clientId,
    playlist_title: playlistTitle,
    playlist_description: playlistDescription,
    playlist_privacy: playlistPrivacy,
})