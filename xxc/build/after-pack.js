const path = require('node:path');
const fs = require('node:fs').promises;
const {executableName} = require('./electron-builder.json').linux;

/**
 * electron builder 打包执行之后的钩子函数
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async ({appOutDir, electronPlatformName}) => {
    if (electronPlatformName !== 'linux') {
        return;
    }
    const script = `#!/bin/bash\n"\${BASH_SOURCE%/*}"/${executableName}.bin --no-sandbox "$@"`;
    const scriptPath = path.join(appOutDir, executableName);

    await fs.rename(scriptPath, `${scriptPath}.bin`);
    await fs.writeFile(scriptPath, script);
    await fs.chmod(scriptPath, 0o755);
};
