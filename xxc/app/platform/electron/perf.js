import {initPerf} from '../../utils/perf';
import {PERF_MESSAGE} from '~/app/platform/electron/remote-events';

if (PERF) {
    // see https://github.com/dotchev/cpu-percentage/blob/master/index.js
    let lastCpuUsage = null;
    const cpuUsage = () => {
        let usage;
        const thisUsage = process.cpuUsage();
        if (lastCpuUsage?._start) {
            usage = {
                time: performance.now() - lastCpuUsage._start.time,
                ...process.cpuUsage(lastCpuUsage._start.cpuUsage)
            };
            usage.time = performance.now() - lastCpuUsage._start.time;
        } else {
            usage = {
                time: process.uptime() * 1000, // s to ms
                ...thisUsage
            };
        }
        usage.percent = (usage.system + usage.user) / (usage.time * 10);
        Object.defineProperty(usage, '_start', {
            value: {
                cpuUsage: thisUsage,
                time: performance.now()
            }
        });
        lastCpuUsage = usage;
        return usage;
    };

    initPerf('renderer', {
        on: listener => {
            window.electronAPI.ipcRenderer.on[PERF_MESSAGE]((_, message) => listener(message));
        },
        send: message => window.electronAPI.ipcRenderer.send[PERF_MESSAGE](message),
        cpuUsage,
        memoryUsage: process.memoryUsage,
    });
}
