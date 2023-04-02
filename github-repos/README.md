## vottuscode-to-liliana

Goes through the repositories of your GitHub account and interactively let's you private/transfer/delete them.

## Get a token here

https://github.com/settings/tokens/new (`repo` scope should be enough)

## Requirements

- Node.js 14+ (used on 16)

## Usage

```bash
$ API_KEY=abcdef NEW_USER=lilianalillyy node index.js
```

(NEW_USER is optional, just showing an example of using multiple env vars)

## Environment variables

- `API_KEY` (required) - GitHub access token
- `NEW_USER` (optional) - If you want to move some repositories to a different account, specify the username here
- `THROW_ON_ERROR` (optional, default: `false`) - Throw an error if an action fails
- `AFTER` (optional) - specify a cursor to skip repositories you've already managed (if you have more than 100 repositories or exit the script mid-way)
