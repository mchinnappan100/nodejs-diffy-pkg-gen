#!/usr/bin/env node

const { program } = require('commander');
const { runCommand } = require('./utils');
const { stringify } = require('csv-stringify/sync');

const banner = `
# ---------------------------------------------------------------------
# pr_info.js
# Author: Mohan Chinnappan
# (Copyleft) Mohan Chinnappan
# - maintain author's name in your copies/modifications
# ---------------------------------------------------------------------
`;

console.error(banner);

program
    .description('Generate a CSV file with commit information for GitHub pull requests')
    .requiredOption('-p, --prs <numbers>', 'Comma-separated PR numbers to fetch')
    .option('-h, --help', 'Display help message', () => {
        console.log('Usage: pr-info [options]');
        console.log('Prepare a CSV file with commit information for given pull requests.');
        console.log('Options:');
        console.log('  -p, --prs <numbers>  Specify the PR numbers to fetch (comma-separated)');
        console.log('  -h, --help           Display this help message');
        process.exit(0);
    })
    .action(async (options) => {
        try {
            const prNumbers = options.prs.split(',').map(num => num.trim());
            if (!prNumbers.length) {
                console.error('Error: PR numbers are required.');
                process.exit(1);
            }

            const csvRecords = [['CommitHash', 'AuthorName', 'AuthorEmail', 'CommitDate', 'CommitMessage', 'ChangeType', 'FilePath', 'PR#']];

            for (const prNumber of prNumbers) {
                const records = await prepareCsv(prNumber);
                csvRecords.push(...records);
            }

            const csvOutput = stringify(csvRecords);
            console.log(csvOutput);
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

async function prepareCsv(prNumber) {
    let prInfoJson;
    try {
        prInfoJson = await runCommand(`gh pr view ${prNumber} --json files,title,number,author,createdAt`);
    } catch (error) {
        console.error(`Error: Unable to fetch PR information for PR #${prNumber}`);
        return [];
    }

    let prInfo;
    try {
        prInfo = JSON.parse(prInfoJson);
    } catch (error) {
        console.error(`Error: Invalid JSON response for PR #${prNumber}`);
        return [];
    }

    const authorName = prInfo.author?.name || 'Unknown';
    const authorEmail = prInfo.author?.login || 'Unknown';
    const commitDate = prInfo.createdAt || '';
    const commitMessage = prInfo.title || '';

    let filesInfo;
    try {
        filesInfo = await runCommand(`gh api "repos/{owner}/{repo}/pulls/${prNumber}/files" --paginate -q '.[] | [.status, .filename, .sha] | @csv'`);
    } catch (error) {
        console.error(`Error: Unable to fetch file changes for PR #${prNumber}`);
        return [];
    }

    const records = [];
    const fileLines = filesInfo.split('\n').filter(line => line.trim());
    for (const line of fileLines) {
        const [changeType, filePath, sha] = line.split(',').map(item => item.replace(/^"|"$/g, ''));

        let mappedChangeType = changeType;
        switch (changeType) {
            case 'removed': mappedChangeType = 'Deleted'; break;
            case 'modified': mappedChangeType = 'Modified'; break;
            case 'renamed': mappedChangeType = 'Renamed'; break;
            case 'added': mappedChangeType = 'Added'; break;
        }

        records.push([
            sha,
            authorName,
            authorEmail,
            commitDate,
            commitMessage,
            mappedChangeType,
            filePath,
            prNumber
        ]);
    }

    return records;
}

program.parse(process.argv);