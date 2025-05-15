const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');

class DiffyPkgGen {
    constructor(csvFile, metadataMappingFile, changeTypes = 'Added,Modified', apiVersion = '59.0') {
        this.csvFile = csvFile;
        this.metadataMappingFile = metadataMappingFile;
        this.changeTypes = changeTypes.split(',').map(type => type.trim());
        this.apiVersion = apiVersion;
        this.remote = false; // Set to true for pipeline scenarios
    }

    async extractMetadata(filepath, metadataMapping) {
        filepath = filepath.trim();
        if (this.remote && !this.changeTypes.includes('Deleted') && !await this.fileExists(filepath)) {
            console.error(`Error: File '${filepath}' for ${this.changeTypes} does not exist`);
            return [null, null];
        }

        const index = filepath.indexOf('/main/default/');
        if (index === -1) {
            return [null, null];
        }

        const parts = filepath.slice(index + '/main/default/'.length).split('/');
        let metadataType = null;
        let memberName = null;

        if (!metadataMapping.hasOwnProperty(parts[0])) {
            console.error(`Error: Metadata type '${parts[0]}' not found in metadata mapping for file path '${filepath}'`);
            return [null, null];
        }

        for (const [key, value] of Object.entries(metadataMapping)) {
            if (key === 'labels' && parts[0] === key) {
                if (!this.changeTypes.includes('Deleted')) {
                    metadataType = value.metadata_type;
                    memberName = '*'; // Wildcard for CustomLabels
                }
                break;
            }

            if (['documents', 'dashboards', 'email'].includes(key) && parts[0] === key) {
                metadataType = value.metadata_type;
                const fileExtension = value.file_extension;
                memberName = `${parts[1]}/${parts[parts.length - 1].replace(fileExtension, '')}`;
                if (key === 'email') {
                    if (memberName.endsWith('emailFolder-meta.xml')) {
                        metadataType = 'EmailTemplateFolder';
                        memberName = memberName.replace('.emailFolder-meta.xml', '');
                    } else {
                        memberName = parts.slice(1).join('/').replace('.email-meta.xml', '');
                    }
                }
                if (key === 'dashboards' && filepath.includes('dashboardFolder-meta.xml')) {
                    memberName = parts.slice(1).join('/').replace('.dashboardFolder-meta.xml', '');
                    metadataType = 'DashboardFolder';
                }
                if (key === 'dashboards' && filepath.includes('dashboard-meta.xml')) {
                    memberName = parts.slice(1).join('/').replace('.dashboard-meta.xml', '');
                    metadataType = 'Dashboard';
                }
                break;
            }

            if (key === 'territory2Models') {
                if (filepath.includes('territory2-meta.xml')) {
                    memberName = parts.slice(1).join('/').replace('.territory2-meta.xml', '').replace('/territories/', '.');
                    metadataType = 'Territory2';
                    break;
                }
                if (filepath.includes('territory2Rule-meta.xml')) {
                    memberName = parts.slice(1).join('/').replace('.territory2Rule-meta.xml', '').replace('/rules/', '.');
                    metadataType = 'Territory2Rule';
                    break;
                }
                if (filepath.includes('territory2Model-meta.xml')) {
                    memberName = parts[1].replace('.territory2Model-meta.xml', '');
                    metadataType = 'Territory2Model';
                    break;
                }
            }

            if (['objectTranslations', 'objects', 'reports'].includes(key) && parts[0] === key) {
                metadataType = value.metadata_type;
                const fileExtension = value.file_extension;
                memberName = parts[parts.length - 1].replace(fileExtension, '');

                if (memberName.endsWith('field-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.field-meta.xml', '')}`;
                    metadataType = 'CustomField';
                } else if (memberName.endsWith('businessProcess-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.businessProcess-meta.xml', '')}`;
                    metadataType = 'BusinessProcess';
                } else if (memberName.endsWith('fieldTranslation-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.fieldTranslation-meta.xml', '')}`;
                    metadataType = 'CustomFieldTranslation';
                } else if (memberName.endsWith('report-meta.xml') || parts[parts.length - 1].endsWith('report-meta.xml')) {
                    const fullpath = parts.slice(1).join('/').replace('.report-meta.xml', '');
                    if (parts[2] && parts[2] !== memberName && !parts[2].endsWith('report-meta.xml')) {
                        memberName = fullpath;
                    } else {
                        memberName = `${parts[1]}/${memberName.replace('.report-meta.xml', '')}`;
                    }
                    metadataType = 'Report';
                } else if (memberName.endsWith('reportFolder-meta.xml')) {
                    const fullpath = parts.slice(1).join('/').replace('.reportFolder-meta.xml', '');
                    if (!parts[1].endsWith('.reportFolder-meta.xml')) {
                        memberName = fullpath;
                    } else {
                        memberName = memberName.replace('.reportFolder-meta.xml', '');
                    }
                    metadataType = 'ReportFolder';
                } else if (memberName.endsWith('recordType-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.recordType-meta.xml', '')}`;
                    metadataType = 'RecordType';
                } else if (memberName.endsWith('compactLayout-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.compactLayout-meta.xml', '')}`;
                    metadataType = 'CompactLayout';
                } else if (memberName.endsWith('listView-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.listView-meta.xml', '')}`;
                    metadataType = 'ListView';
                } else if (memberName.endsWith('webLink-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.webLink-meta.xml', '')}`;
                    metadataType = 'WebLink';
                } else if (memberName.endsWith('validationRule-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.validationRule-meta.xml', '')}`;
                    metadataType = 'ValidationRule';
                } else if (memberName.endsWith('fieldSet-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.fieldSet-meta.xml', '')}`;
                    metadataType = 'FieldSet';
                } else if (memberName.endsWith('index-meta.xml')) {
                    memberName = `${parts[1]}.${memberName.replace('.index-meta.xml', '')}`;
                    metadataType = 'Index';
                }
                break;
            }

            if (key.startsWith('wave') && filepath.includes('/wave/')) {
                const pattern = /\.(wds|wdf|wdpr|wcomp|wapp|wdash|xmd|collection)(-meta\.xml)?$/;
                const match = filepath.match(pattern);
                if (match && value.file_extensions && value.file_extensions.includes(`.${match[1]}`)) {
                    metadataType = value.metadata_type;
                    memberName = parts[parts.length - 1].split('.')[0];
                    return [metadataType, memberName];
                }
            }

            if (parts[0] === key) {
                if (['lwc', 'aura'].includes(key) && parts.length > 1) {
                    metadataType = value.metadata_type;
                    memberName = parts[1];
                } else if (key === 'digitalExperiences' && parts.length > 1) {
                    metadataType = value.metadata_type;
                    memberName = `${parts[1]}/${parts[2]}`;
                } else if (key === 'staticresources') {
                    if (!this.changeTypes.includes('Deleted')) {
                        metadataType = value.metadata_type;
                        memberName = '*';
                    }
                } else if (value.file_extension) {
                    metadataType = value.metadata_type;
                    const fileExtension = Array.isArray(value.file_extension) ? value.file_extension : [value.file_extension];
                    for (const ext of fileExtension) {
                        if (parts[parts.length - 1].endsWith(ext)) {
                            memberName = parts[parts.length - 1].replace(ext, '');
                            return [metadataType, memberName];
                        }
                    }
                } else if (!key.startsWith('wave')) {
                    metadataType = value.metadata_type;
                    memberName = parts[parts.length - 1].split('.')[0];
                }
                break;
            }
        }

        return [metadataType, memberName];
    }

    async fileExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }

    async generatePackageXml() {
        try {
            const metadataMapping = JSON.parse(await fs.readFile(this.metadataMappingFile, 'utf8'));
            let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
            const metadataDict = {};

            const csvContent = await fs.readFile(this.csvFile, 'utf8');
            const records = parse(csvContent, { columns: true, skip_empty_lines: true });

            if (!records.length || !records[0].ChangeType || !records[0].FilePath) {
                console.error('Error: The CSV file is empty or missing header.');
                process.exit(1);
            }

            for (const row of records) {
                const changeType = row.ChangeType;
                if (this.changeTypes.includes(changeType)) {
                    const filePath = row.FilePath;
                    const [metadataType, memberName] = await this.extractMetadata(filePath, metadataMapping);
                    if (metadataType && memberName) {
                        if (!metadataDict[metadataType]) {
                            metadataDict[metadataType] = new Set();
                        }
                        metadataDict[metadataType].add(memberName);
                    }
                }
            }

            for (const metadataType of Object.keys(metadataDict).sort()) {
                packageXml += '\t<types>\n';
                for (const member of Array.from(metadataDict[metadataType]).sort()) {
                    packageXml += `\t\t<members>${member}</members>\n`;
                }
                packageXml += `\t\t<name>${metadataType}</name>\n`;
                packageXml += '\t</types>\n';
            }

            packageXml += `\t<version>${this.apiVersion}</version>\n</Package>`;
            return packageXml;
        } catch (error) {
            if (error.code === 'ENOENT') {
                const packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
                                   `\t<version>${this.apiVersion}</version>\n</Package>`;
                console.error('Error: Diff CSV file not found. Nothing to do!');
                console.log(packageXml);
                process.exit(1);
            }
            throw error;
        }
    }
}

module.exports = DiffyPkgGen;