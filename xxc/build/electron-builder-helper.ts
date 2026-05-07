import path from 'node:path';
import type {PackageConfig} from './config-helper';

type ElectronBuilderOptions = {
    isFullDebug: boolean;
    isDebug: boolean;
    isBuildWinMsi: boolean;
    isBuildAppImage: boolean;
    betaString: string;
};

export const ARTIFACT_NAMES = {
    common: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}.${arch}.${ext}',
    mac: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}${env.MAC_CHIP_SHORT}.${ext}',
    win: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}${env.PKG_ARCH}.setup.${ext}',
    winZip: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}${env.PKG_ARCH}.${ext}',
    linuxZip: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}${env.PKG_ARCH}.${ext}',
    macZip: '${name}.${env.PKG_VER}${env.PKG_BETA}${env.PKG_DEBUG}.${os}${env.MAC_CHIP_SHORT}.${ext}',
};

export function getElectronBuilderConfig(config: PackageConfig, options: ElectronBuilderOptions) {
    const {certificateFile, certificatePassword} = config;
    const {isFullDebug, isDebug, isBuildWinMsi, isBuildAppImage, betaString} = options;
    const winCertificateConfig = certificateFile && certificatePassword
        ? {
            certificateFile,
            certificatePassword
        }
        : {};
    const electronBuilderConfig = {
        productName: config.name,
        appId: config.appid || `com.cnezsoft.${config.name}`,
        compression: 'maximum',
        artifactName: config.artifactName || ARTIFACT_NAMES.common,
        electronVersion: config.electronVersion,
        electronDownload: {mirror: 'https://npmmirror.com/mirrors/electron/'},
        extraResources: [{
            from: 'app/build-in/',
            to: 'build-in'
        }, {
            from: 'app/lang/',
            to: 'lang'
        }, {
            from: 'app/bin/',
            to: 'bin'
        }],
        dmg: {
            contents: [{
                x: 130,
                y: 220
            }, {
                x: 410,
                y: 220,
                type: 'link',
                path: '/Applications'
            }],
            title: `${config.productName} ${config.displayVersion}${betaString ? `-${betaString}` : ''}${isDebug ? '.debug' : ''}`
        },
        files: [
            'package.json',
            'node_modules/',
            'main.js',
            isFullDebug ? 'main.js.map' : '',
            'index.html',
            'screenshot/',
            'assets/',
            {
                from: 'assets/',
                to: 'assets/',
                filter: ['!*.dev.*']
            },
            {
                from: 'dist/',
                to: 'dist/',
                filter: [isFullDebug ? '' : '!*.map', '!*.analyze.*'].filter(Boolean)
            },
            {
                from: (config.copyOriginMedia && config.mediaPath !== 'media/') ? 'media-build/' : config.mediaPath,
                to: 'media/'
            },
            {
                from: config.resourcePath ? path.resolve(config.dir, config.resourcePath) : '../resources/',
                to: 'resources'
            },
        ].filter(Boolean),
        win: {
            target: isBuildWinMsi ? ['nsis', 'msi'] : ['nsis'],
            signDlls: true,
            ...winCertificateConfig
        },
        linux: {
            target: [
                'deb',
                'tar.gz',
                ...(isBuildAppImage ? ['AppImage'] : [])
            ],
            icon: 'icon.icns',
            artifactName: config.artifactName || ARTIFACT_NAMES.common,
            desktop: {
                Name: config.productName,
            },
            category: 'Chat',
            executableName: config.name,
        },
        mac: {
            icon: 'icon.icns',
            artifactName: config.macArtifactName || ARTIFACT_NAMES.mac,
            darkModeSupport: config.darkModeSupport,
            entitlements: 'resources/build/entitlements.mac.plist',
            hardenedRuntime: true,
            identity: config.identity,
            extendInfo: {
                NSMicrophoneUsageDescription: '请允许本程序访问您的麦克风',
                NSCameraUsageDescription: '请允许本程序访问您的摄像头',
            },
            target: [
                'dmg'
            ],
            category: 'public.app-category.productivity',
            notarize: {
                teamId: process.env.APPLE_TEAM_ID
            }
        },
        nsis: {
            shortcutName: config.productName,
            uninstallDisplayName: `${config.productName} ${config.displayVersion}${betaString ? `-${betaString}` : ''}${isDebug ? '.debug' : ''}`,
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            artifactName: config.winArtifactName || ARTIFACT_NAMES.win,
            deleteAppDataOnUninstall: false
        },
        directories: {
            app: 'app',
            buildResources: config.resourcePath ? path.resolve(config.dir, config.resourcePath) : 'resources',
            output: config.name === 'xuanxuan' ? `release/${config.displayVersion}${betaString ? `-${betaString}` : ''}` : `release/${config.name}-${config.displayVersion}${betaString ? `-${betaString}` : ''}`
        },
        appImage: {
            artifactName: config.linuxZipArtifactName || ARTIFACT_NAMES.linuxZip,
        },
        afterPack: path.resolve(__dirname, './after-pack.js'),
    };

    if (config.buildInPath) {
        electronBuilderConfig.extraResources.push({
            from: path.resolve(config.dir, config.buildInPath),
            to: 'build-in'
        });
    }

    if (config.langPath) {
        electronBuilderConfig.extraResources.push({
            from: path.resolve(config.dir, config.langPath),
            to: 'lang'
        });
    }
    return electronBuilderConfig;
}

export type ElectronBuilder = ReturnType<typeof getElectronBuilderConfig>;
