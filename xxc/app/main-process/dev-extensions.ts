import fs from 'node:fs';
import path from 'node:path';
import {session, app} from 'electron';

/**
 * 安装调试模式所使用的 Electron 开发工具扩展
 */
export async function installExtensions() {
    if (process.env.PERF || process.env.NODE_ENV !== 'development' || process.env.SKIP_INSTALL_EXTENSIONS) {
        return;
    }

    let extensionsPath = process.env.EXTENSIONS_PATH || './dev-exts/';

    if (!path.isAbsolute(extensionsPath)) {
        extensionsPath = path.resolve(app.getAppPath(), extensionsPath);
    }

    if (!fs.existsSync(extensionsPath)) {
        console.log(`>> Skip to install extensions from path ${extensionsPath}, because the path is not exists.`);
        return;
    }

    console.log(`>> Install extensions from path ${extensionsPath}`);

    const extensions = ['react-devtools'];
    for (const extension of extensions) {
        const extensionPath = path.join(extensionsPath, extension);
        try {
            await session.defaultSession.loadExtension(extensionPath, {allowFileAccess: true});
            console.log(`>> Installed extension "${extension}" from path ${extensionPath}.`);
        } catch (error) {
            console.error(`>> Install extension "${extension}" error.`, error);
        }
    }
}
