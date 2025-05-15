const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr && !stdout) {
            throw new Error(stderr);
        }
        return stdout.trim();
    } catch (error) {
        throw new Error(`Command failed: ${command}\n${error.message}`);
    }
}

module.exports = { runCommand };