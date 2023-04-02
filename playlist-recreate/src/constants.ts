import * as url from 'url';

export const rootDir = url.fileURLToPath(new URL('.', import.meta.url));

export const ytWatchUrlRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
