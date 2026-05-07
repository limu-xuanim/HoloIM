import os from 'node:os';

export default {
    osUptime: os.uptime,
    osNetworkInterfaces: os.networkInterfaces,
    osPlatform: os.platform,
    osEOL: os.EOL,
};
