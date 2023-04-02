const { Octokit } = require("octokit");
const { prompt } = require("inquirer");
const chalk = require("chalk");

const API_KEY = process.env.API_KEY ? String(process.env.API_KEY).trim() : null;
let NEW_USER = process.env.NEW_USER ? String(process.env.NEW_USER).trim() : null;
let THROW_ON_ERROR = process.env.THROW_ON_ERROR ? String(process.env.THROW_ON_ERROR) === "true" : false;
let AFTER = process.env.AFTER ? String(process.env.AFTER).trim() : false;

if (!API_KEY || API_KEY.length < 1) {
    throw new Error(chalk.red("You must provide a GitHub access token"));
}

// Set to null if value is an empty string
if (!NEW_USER || NEW_USER.length < 1) {
    NEW_USER = null;
}

if (!AFTER || AFTER.length < 1) {
    AFTER = null
}

/**
 * GitHub's official REST API client
 * Reference: https://github.com/octokit/core.js#readme
 */
const octokit = new Octokit({
    auth: API_KEY,
});

const Actions = {
    ...(NEW_USER ? { 
        Transfer: `Move to ${NEW_USER}`,
        PrivateAndTransfer: `Make private and move to ${NEW_USER}`,
    } : {}),
    Delete: 'Delete permanently',
    Private: 'Make private',
    AsIs: 'Leave as-is',
};

const archiveRepo = async ({ owner: { login: owner }, name: repo }, archived = true) => {
    return await octokit.request("PATCH /repos/{owner}/{repo}", {
        owner,
        repo,
        archived
    });
};

/**
 * Some actions will not work if the repository is marked as archived.
 * To get around that this function un-archives the repository before
 * calling the promise and re-archives it afterwards.
 */
const withRepoCheck = async (repo, promiseFn) => {
    if (!repo.isArchived) {
        return promiseFn(repo);
    }

    await archiveRepo(repo, false);
    await promiseFn(repo);
    await archiveRepo(repo, true);
}

const transferRepo = async ({ owner: { login: owner }, name: repo }) =>
    await octokit.request("POST /repos/{owner}/{repo}/transfer", {
        owner,
        repo,
        new_owner: NEW_USER
    });


const deleteRepo = async ({ owner: { login: owner }, name: repo }) =>
    await octokit.request("DELETE /repos/{owner}/{repo}", {
        owner,
        repo,
    });


const privateRepo = async (repo) => await withRepoCheck(
    repo,
    async ({ owner: { login: owner }, name: repo }) =>
        await octokit.request("PATCH /repos/{owner}/{repo}", {
            owner,
            repo,
            private: true
        })
)

const queryRepos = () => octokit.graphql(`
query { 
    viewer { 
        repositories(first: 100, after: ${AFTER}, affiliations: [OWNER]) {
            edges {
                cursor,
                node {
                    id,
                    nameWithOwner,
                    name,
                    owner {
                        login
                    },
                    url,
                    description,
                    createdAt,
                    pushedAt,
                    isFork,
                    isPrivate,
                    isArchived
                }
            }
        }
    }
}
`)

const handlePrompt = async (repo) => {
    const { nameWithOwner, url, description, createdAt, pushedAt, isFork, isPrivate, isArchived, cursor } = repo;

    const availabilityState = isPrivate ? chalk.yellow('Private') : chalk.greenBright('Public');
    const archivedState = isArchived ? chalk.red("Archived") : '';
    const forkedState = isFork ? chalk.blue("Fork") : '';

    // Space between each prompt
    console.log("\n\n")

    const { action } = await prompt([
        {
            type: 'list',
            name: 'action',
            message: [
                // Looking pretty has it's cost...
                chalk.gray(`${availabilityState} ${archivedState} ${forkedState} ${chalk.magenta(nameWithOwner)} - ${description ?? 'No description'} | ${url}`),
                `Created: ${createdAt}, last push ${pushedAt}`,
                `Cursor: ${cursor}`,
                ``,
                'Action:'
            ].join("\n"),
            choices: Object.values(Actions).filter(action => {
                // Public forks can't be made private, also remove private action when already private
                if ((isPrivate || (!isPrivate && isFork)) && (action === Actions.Private || action === (Actions.PrivateAndTransfer ?? ''))) {
                    return false;
                }

                return true
            }),
        },
    ])

    try {
        switch (action) {
            case Actions.Delete:
                const { confirm } = await prompt([
                    {
                        name: "confirm",
                        type: "confirm",
                        message: `Are you sure you want to delete "${nameWithOwner}"`
                    }
                ]);

                if (!confirm) {
                    return handlePrompt(repo);
                }

                return await deleteRepo(repo);
            case Actions.Transfer:
                return await transferRepo(repo);
            case Actions.Private:
                return await privateRepo(repo);
            case Actions.PrivateAndTransfer:
                await privateRepo(repo)
                return await transferRepo(repo);
            default:
                console.log("No action taken");
                return null;
        }
    } catch (error) {
        if (THROW_ON_ERROR) {
            throw error;
        }

        console.log(chalk.red(`Error: ${chalk.bold(error?.message ?? 'Unknown')}`))
        return handlePrompt(repo)
    }
}

const run = async () => {
    let { viewer: { repositories: { edges: repos } } } = await queryRepos();

    repos = repos.map(repo => ({ ...repo.node, cursor: repo.cursor }))

    if (repos.length < 1) {
        console.log(chalk.yellow(`There are not repositories after cursor ${AFTER}`))
    }

    lastCursor = null;

    for (const repo of repos) {
        lastCursor = repo.cursor;
        await handlePrompt(repo);
    }

    if (lastCursor) {
        console.log(chalk.gray(`\nThe last cursor used was ${lastCursor}\nIf you have more repositories, run the script again with AFTER="${lastCursor}"`))
    }
}

run()