#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs').promises;
const os = require('os');
const DiffyPkgGen = require('./diffyPkgGen');
const { runCommand } = require('./utils');
const { stringify } = require('csv-stringify/sync');



const banner = `
# ---------------------------------
# make-prs-to-pkg.js
# Author: Mohan Chinnappan
# (Copyleft) Mohan Chinnappan
# ---------------------------------
# Generate package.xml from GitHub PRs for Salesforce Metadata API
`;

console.error(banner);

program
    .description('Generate package.xml from PRs by running pr-info and diffy-pkg-gen')
    .argument('<pr_numbers>', 'Comma-separated PR numbers (e.g., 30102,30036)')
    .requiredOption('--csv-path <path>', 'Output path for CSV file', '/tmp/diff3.csv')
    .requiredOption('--metadata-mapping-path <path>', 'Path to metadata_mapping.json', os.homedir() + '/prs-2-xml/scripts/metadata_mapping.json')
    .option('--api-version <version>', 'Salesforce API version', '63.0')
    .option('--change-types <types>', 'Change types for first package.xml (e.g., Added,Modified,Renamed)', 'Added,Modified,Renamed')
    .option('--delete-change-types <types>', 'Change types for deletions package.xml (e.g., Deleted)', 'Deleted')
    .action(async (prNumbers, options) => {
        try {
            console.error('--- Generating PRs to Package.xml ---');

            // Step 1: Generate CSV using pr-info logic
            console.error(('Extracting PR information...'));
            const csvRecords = [['CommitHash', 'AuthorName', 'AuthorEmail', 'CommitDate', 'CommitMessage', 'ChangeType', 'FilePath', 'PR#']];
            const prs = prNumbers.split(',').map(num => num.trim());
            for (const prNumber of prs) {
                const records = await prepareCsv(prNumber);
                csvRecords.push(...records);
            }

            if (csvRecords.length === 1) {
                console.error(('Error: No valid PR data extracted. Check PR numbers or GitHub CLI authentication.'));
                process.exit(1);
            }

            const csvOutput = stringify(csvRecords);
            await fs.writeFile(options.csvPath, csvOutput);
            console.error((`Wrote CSV to ${options.csvPath}`));

            // Step 2: Generate package.xml for change-types (e.g., Added,Modified,Renamed)
            console.error(('--- Package Generation ---'));
            console.error((`Generating package.xml for ${options.changeTypes} components...`));
            const generator = new DiffyPkgGen(options.csvPath, options.metadataMappingPath, options.changeTypes, options.apiVersion);
            const packageXml = await generator.generatePackageXml();
            console.log(packageXml);

            // Step 3: Generate package.xml for delete-change-types (e.g., Deleted)
            console.error(('--- Deletions ---'));
            console.error((`Generating package.xml for ${options.deleteChangeTypes} components...`));
            const deleteGenerator = new DiffyPkgGen(options.csvPath, options.metadataMappingPath, options.deleteChangeTypes, options.apiVersion);
            const deletePackageXml = await deleteGenerator.generatePackageXml();
            console.log(deletePackageXml);

            console.error(('Process completed successfully!'));
        } catch (error) {
            console.error((`Error: ${error.message}`));
            process.exit(1);
        }
    });

// Reuse prepareCsv from prInfo.js
async function prepareCsv(prNumber) {
    let prInfoJson;
    try {
        prInfoJson = await runCommand(`gh pr view ${prNumber} --json files,title,number,author,createdAt`);
    } catch (error) {
        console.error((`Error: Unable to fetch PR information for PR #${prNumber}`));
        return [];
    }

    let prInfo;
    try {
        prInfo = JSON.parse(prInfoJson);
    } catch (error) {
        console.error((`Error: Invalid JSON response for PR #${prNumber}`));
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
        console.error((`Error: Unable to fetch file changes for PR #${prNumber}`));
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