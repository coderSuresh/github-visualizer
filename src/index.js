import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { profileStatsQuery, repositoryQuery, commitHistoryQuery } from '../src/queries.js';
import { generateSvg } from './generate-svg.js';

dotenv.config();

const toDate = new Date().toISOString();
const fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();

const fetchFromGitHub = async (query, variables) => {
    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GHUB_TOKEN}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    
    if (json.errors) {
        throw new Error("GitHub GraphQL API returned errors.");
    }

    return json.data;
};

const getAllRepositories = async (username) => {
    let allRepos = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const repoData = await fetchFromGitHub(repositoryQuery, {
            login: username,
            first: 100,
            after: endCursor
        });

        const repoInfo = repoData?.user?.repositories;
        if (!repoInfo) break;

        allRepos.push(...repoInfo.nodes);
        hasNextPage = repoInfo.pageInfo.hasNextPage;
        endCursor = repoInfo.pageInfo.endCursor;
    }

    return allRepos;
};

const getAllData = async () => {
    try {
        const username = process.env.USERNAME;
        if (!username || !process.env.GHUB_TOKEN) {
            throw new Error(".env file doesn't contain GHUB_TOKEN or USERNAME.");
        }

        const [profileRes, commitRes, allRepos] = await Promise.all([
            fetchFromGitHub(profileStatsQuery, { login: username, from: fromDate, to: toDate }),
            fetchFromGitHub(commitHistoryQuery, { login: username, from: fromDate, to: toDate }),
            getAllRepositories(username)
        ]);

        const finalData = {
            profile: profileRes,
            repositories: allRepos,
            commitHistory: commitRes,
        };

        const dirPath = path.join(process.cwd(), './data');
        const filePath = path.join(dirPath, 'data.json');

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));

    } catch (error) {
        console.error('Something went wrong:', error.message);
    }
};

getAllData().then(() => {
    generateSvg();
});