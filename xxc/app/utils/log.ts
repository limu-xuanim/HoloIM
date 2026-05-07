import pkg from '~/app/package.json';

/**
 * 初始化 window.console 对象
 */
function initConsoleObject() {
    const STYLE = {
        rounded: 'border-radius: 3px;',
        block: 'display: block;',
        bold: 'font-weight: bold;',
        h1: 'font-size: 24px; font-weight: bold;',
        h2: 'font-size: 20px; font-weight: bold;',
        h3: 'font-size: 18px; font-weight: bold;',
        h4: 'font-size: 16px; font-weight: bold;',
        h5: 'font-size: 14px; font-weight: bold;',
        h6: 'font-size: 12px; font-weight: bold;',
        muted: 'color: #aaa;',

        pink: 'color: #e91e63;',
        pinkLight: 'color: #ff6090;',
        pinkDark: 'color: #b0003a;',
        pinkPale: 'background: rgba(233, 30, 99, 0.2); color: #e91e63; border-radius: 0 2px 2px 0',
        pinkBg: 'background: #e91e63; color: #fff; border-radius: 2px 0 0 2px',
        pinkBgLight: 'background: #ff6090; color: #fff;',
        pinkBgDark: 'background: #b0003a; color: #fff;',
        pinkOutline: 'color: #e91e63; border-color: #e91e63;',

        blue: 'color: #2196f3;',
        blueLight: 'color: #6ec6ff;',
        blueDark: 'color: #0069c0;',
        bluePale: 'background: rgba(33, 150, 243, 0.2); color: #2196f3; border-radius: 0 2px 2px 0',
        blueBg: 'background: #2196f3; color: #fff; border-radius: 2px 0 0 2px',
        blueBgLight: 'background: #6ec6ff; color: #fff;',
        blueBgDark: 'background: #0069c0; color: #fff;',
        blueOutline: 'color: #2196f3; border-color: #2196f3;',

        green: 'color: #4caf50;',
        greenLight: 'color: #80e27e;',
        greenDark: 'color: #087f23;',
        greenPale: 'background: rgba(76, 175, 80, 0.2); color: #4caf50; border-radius: 0 2px 2px 0',
        greenBg: 'background: #4caf50; color: #fff; border-radius: 2px 0 0 2px',
        greenBgLight: 'background: #80e27e; color: #fff;',
        greenBgDark: 'background: #087f23; color: #fff;',
        greenOutline: 'color: #4caf50; border-color: #4caf50;',

        red: 'color: #f44336;',
        redLight: 'color: #ff7961;',
        redDark: 'color: #ba000d;',
        redPale: 'background: rgba(244, 67, 54, 0.2); color: #f44336; border-radius: 0 2px 2px 0',
        redBg: 'background: #f44336; color: #fff; border-radius: 2px 0 0 2px',
        redBgLight: 'background: #ff7961; color: #fff;',
        redBgDark: 'background: #ba000d; color: #fff;',
        redOutline: 'color: #f44336; border-color: #f44336;',

        orange: 'color: #ff9800;',
        orangeLight: 'color: #ffc947;',
        orangeDark: 'color: #c66900;',
        orangePale: 'background: rgba(255, 152, 0, 0.2); color: #ff9800; border-radius: 0 2px 2px 0',
        orangeBg: 'background: #ff9800; color: #fff; border-radius: 2px 0 0 2px',
        orangeBgLight: 'background: #ffc947; color: #fff;',
        orangeBgDark: 'background: #c66900; color: #fff;',
        orangeOutline: 'color: #ff9800; border-color: #ff9800;',

        deepOrange: 'color: #ff5722;',
        deepOrangeLight: 'color: #ff8a50;',
        deepOrangeDark: 'color: #c41c00;',
        deepOrangePale: 'background: rgba(255, 87, 34, 0.2); color: #ff5722; border-radius: 0 2px 2px 0',
        deepOrangeBg: 'background: #ff5722; color: #fff; border-radius: 2px 0 0 2px',
        deepOrangeBgLight: 'background: #ff8a50; color: #fff;',
        deepOrangeBgDark: 'background: #c41c00; color: #fff;',
        deepOrangeOutline: 'color: #ff5722; border-color: #ff5722;',

        purple: 'color: #9c27b0;',
        purpleLight: 'color: #d05ce3;',
        purpleDark: 'color: #6a0080;',
        purplePale: 'background: rgba(156, 39, 176, 0.2); color: #9c27b0; border-radius: 0 2px 2px 0',
        purpleBg: 'background: #9c27b0; color: #fff; border-radius: 2px 0 0 2px',
        purpleBgLight: 'background: #d05ce3; color: #fff;',
        purpleBgDark: 'background: #6a0080; color: #fff;',
        purpleOutline: 'color: #9c27b0; border-color: #9c27b0;',

        teal: 'color: #009688;',
        tealLight: 'color: #52c7b8;',
        tealDark: 'color: #00675b;',
        tealPale: 'background: rgba(0, 150, 136, 0.2); color: #009688; border-radius: 0 2px 2px 0',
        tealBg: 'background: #009688; color: #fff; border-radius: 2px 0 0 2px',
        tealBgLight: 'background: #52c7b8; color: #fff;',
        tealBgDark: 'background: #00675b; color: #fff;',
        tealOutline: 'color: #009688; border-color: #009688;',

        indigo: 'color: #3f51b5;',
        indigoLight: 'color: #757de8;',
        indigoDark: 'color: #002984;',
        indigoPale: 'background: rgba(63, 81, 181, 0.2); color: #3f51b5; border-radius: 0 2px 2px 0',
        indigoBg: 'background: #3f51b5; color: #fff; border-radius: 2px 0 0 2px',
        indigoBgLight: 'background: #757de8; color: #fff;',
        indigoBgDark: 'background: #002984; color: #fff;',
        indigoOutline: 'color: #3f51b5; border-color: #3f51b5;',

        gray: 'color: #666;',
        grayLight: 'color: #999;',
        grayDark: 'color: #333;',
        grayPale: 'background: #6663; color: #666; border-radius: 0 2px 2px 0',
        grayBg: 'background: #666; color: #fff; border-radius: 2px 0 0 2px',
        grayBgLight: 'background: #999; color: #000;',
        grayBgDark: 'background: #333; color: #fff;',
        grayOutline: 'color: #666; border-color: #666;',
    };

    const formatOutput = (args: any[]) => {
        const output = [''];
        const format: string[] = [];
        args.forEach((arg, idx) => {
            const index = Math.floor(idx / 2);
            if (idx % 2 === 1) {
                format[index] = `%c${format[index]}`;
                let style = 'padding: 0 4px; border: 1px solid transparent;';
                if (Array.isArray(arg)) {
                    style += arg.reduce((tmpStyle, styleName) => tmpStyle + (STYLE[styleName as keyof typeof STYLE] || styleName), '');
                } else if (typeof arg === 'object') {
                    style += Object.keys(arg).reduce((tmpStyle, propName) => (`${tmpStyle}${propName}: ${arg[propName]}`), '');
                } else {
                    style += STYLE[arg as keyof typeof STYLE] || arg;
                }
                output.push(style);
            } else {
                format.push(arg);
            }
        });
        output[0] = format.join('');
        return output;
    };

    console.color = (...args) => {
        if (DEBUG) {
            console.log(...formatOutput(args));
        }
    };

    console.collapse = (...args) => {
        console.groupCollapsed(...formatOutput(args));
    };

    console.collapse(pkg.name, ['h1', 'pinkBg', 'block', 'padding: 5px 10px; border-radius: 10px 0 0 10px'], pkg.version, ['h1', 'pinkPale', 'block', 'padding: 5px 10px; border-radius: 0 10px 10px 0']);
    const info: Record<string, string> = {
        Company: pkg.company,
        License: pkg.license,
        Homepage: pkg.homepage,
        Issues: pkg.bugs.url,
    };
    if (window.nodeAPI?.processVersions) {
        if (window.nodeAPI.processVersions.electron) {
            info.Electron = window.nodeAPI.processVersions.electron;
        } else if (window.nodeAPI.processVersions.nw) {
            info.NWJS = window.nodeAPI.processVersions.nw;
        }
        info.NodeJS = window.nodeAPI.processVersions.node;
        if (window.nodeAPI.processVersions.chrome) {
            info.chrome = window.nodeAPI.processVersions.chrome;
        } else if (window.nodeAPI.processVersions.chromium) {
            info.chromium = window.nodeAPI.processVersions.chromium;
        }
        info.modules = window.nodeAPI.processVersions.modules;
        info.V8 = window.nodeAPI.processVersions.v8;
    }
    if (process.arch) {
        info.arch = process.arch;
    }
    if (process.env) {
        for (const name of ['DIRNAME', 'LANG', 'NODE_ENV', 'HOT', 'HOT_SERVER', 'PERF', 'REACT_PERF', 'PERF_FPS_INTERVAL', 'EXTENSIONS_PATH', 'SKIP_INSTALL_EXTENSIONS', 'BROWSER_URL_PARAMS', 'DEV_TOOLS']) {
            if (process.env[name] !== undefined) {
                info[`env.${name}`] = process.env[name];
            }
        }
    }
    if (process.argv) {
        info.argv = JSON.stringify(process.argv);
    }
    console.table(info);
    console.groupEnd();
}

if (DEBUG && typeof window !== 'undefined' && window.console) {
    initConsoleObject();
}
