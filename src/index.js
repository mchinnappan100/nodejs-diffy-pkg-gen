#!/usr/bin/env node

const { program } = require('commander');
const DiffyPkgGen = require('./diffyPkgGen');

const banner = `
888888ba  oo .8888b .8888b              888888ba   .88888.  
88    \`8b    88   " 88   "              88    \`8b d8'   \`88
88     88 dP 88aaa  88aaa  dP    dP    a88aaaa8P' 88        
88     88 88 88     88     88    88     88        88   YP88
88    .8P 88 88     88     88.  .88     88        Y8.   .88
8888888P  dP dP     dP     \`8888P88     dP         \`88888'  
                                .88                        
                            d8888P                          

                 Diffy PG
    diffy package.xml generator - (Copyleft) by Mohan Chinnappan
    - maintain author's name in your copies/modifications
`;

console.error(banner);

program
    .description('Generate package.xml from CSV file')
    .requiredOption('--csv-file <path>', 'Path to CSV file')
    .requiredOption('--metadata-mapping-file <path>', 'Path to metadata mapping JSON file')
    .option('--change-types <types>', 'Types of changes to include in the package as comma-separated values', 'Added,Modified')
    .option('--api-version <version>', 'Salesforce API version', '59.0')
    .action(async (options) => {
        try {
            const generator = new DiffyPkgGen(
                options.csvFile,
                options.metadataMappingFile,
                options.changeTypes,
                options.apiVersion
            );
            const packageXmlContent = await generator.generatePackageXml();
            console.log(packageXmlContent);
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

program.parse(process.argv);