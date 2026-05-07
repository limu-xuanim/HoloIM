global.PERF = !!process.env.PERF;

global.PERF_MARK_STASHES = global.PERF ? new Set() : null;

global.PERF_MARK = global.PERF ? (markName, measureStartMarkName, measureName, onlyMarkHasMeasure = true) => {
    if (onlyMarkHasMeasure && measureStartMarkName && !global.PERF_MARK_STASHES.has(measureStartMarkName)) {
        if (typeof window !== 'undefined') {
            console.log('%cPERF.mark fail', 'color:#f50057;font-weight:bold', `Measure start mark name "${measureStartMarkName}" not exists.`);
        }
        return;
    }
    const mark = performance.mark(markName);
    global.PERF_MARK_STASHES.add(markName);
    // if (typeof window !== 'undefined') {
    //     console.log('%cPERF.mark', 'color:#f50057;font-weight:bold', markName);
    // }
    if (measureStartMarkName && global.PERF_MARK_STASHES.has(measureStartMarkName)) {
        global.PERF_MARK_STASHES.delete(measureStartMarkName);
        return [mark, performance.measure(
            `${measureName || ''}:${measureStartMarkName}-${markName}`,
            measureStartMarkName,
            markName
        )];
    }
    return mark;
} : () => {};

global.PERF_MEASURE = global.PERF ? (startMarkName, endMarkName, measureName) => performance.measure(
    measureName || `${startMarkName}-${endMarkName}`,
    startMarkName,
    endMarkName
) : () => {};

global.PERF_HAS_MARK = global.PERF ? (markName) => global.PERF_MARK_STASHES.has(markName) : () => {};

const cmdHandlers = global.PERF ? {} : null;

export function setPerfCommandHandlers(handlers) {
    if (cmdHandlers) {
        Object.assign(cmdHandlers, handlers);
    }
}

/**
 * Init perf
 * @param {String} processName Process name
 * @param {{on: Function, send: Function, cmdHandlers: Object, messageHandler: function, fallbackHandler: Function, cpuUsage: Function, memoryUsage: Function}} proxy Process message proxy object
 * @param {{mark: Function, measure: Function, memory: Function}} [performance] performance object
 * @param {Object} [PerformanceObserver] PerformanceObserver class
 * @returns {void}
 */
export function initPerf(processName, proxy, performance, PerformanceObserver) {
    const isInBrowser = typeof window !== 'undefined';
    if (isInBrowser && window.performance) {
        ({performance, PerformanceObserver} = window);
    } else {
        global.performance = performance;
        global.PerformanceObserver = PerformanceObserver;
    }

    /**
     * Convert PerformanceEntry  to message object
     * @param {PerformanceEntry} entry PerformanceEntry
     * @returns {Object} message object
     */
    const convertEntryToMessage = entry => ({
        type: entry.entryType,
        detail: entry.detail,
        duration: entry.duration,
        name: entry.name,
        startTime: entry.startTime,
        process: processName,
    });

    // Observe performance entries
    const perfObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const messages = [];
        for (const entry of entries) {
            if (entry.name[0] !== '⚛' && entry.name[0] !== '⛔') {
                messages.push(convertEntryToMessage(entry));
            }
        }
        if (messages.length > 1) {
            proxy.send(messages);
        } else if (messages.length) {
            proxy.send(messages[0]);
        }
        if (isInBrowser && messages.length) {
            console.log('%cPERF.entries', 'color:#f50057;font-weight:bold', messages);
        }
    });
    perfObserver.observe({entryTypes: ['mark', 'frame', 'measure']});

    // Listen
    setPerfCommandHandlers({
        mark: (markName) => convertEntryToMessage(performance.mark(markName)),
        measure: (markName) => convertEntryToMessage(performance.measure(markName)),
        ...proxy.cmdHandlers
    });
    proxy.on(async message => {
        if (isInBrowser) {
            console.log('%cPERF.message', 'color:#f50057;font-weight:bold', message);
        }
        if (proxy.messageHandler && proxy.messageHandler(message) === true) {
            return;
        }
        if (message.type === 'cmd') {
            const {mid, cmd, args} = message;
            let handler = cmdHandlers[cmd];
            if (!handler) {
                handler = () => new Error(`Invalid command name "${cmd}".`);
            }
            try {
                const resolve = await handler(...args);
                proxy.send({
                    type: 'cmd',
                    mid,
                    resolve,
                    process: processName,
                });
            } catch (error) {
                const reject = {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                };
                proxy.send({
                    type: 'cmd',
                    mid,
                    reject,
                    process: processName,
                });
            }
        } else if (proxy.fallbackHandler) {
            proxy.fallbackHandler(message);
        }
    });

    if (isInBrowser) {
        // Report fps
        let frame = 0;
        let lastFrameTime = performance.now();
        const fpsReportInterval = process.env.PERF_FPS_INTERVAL ? Number.parseInt(process.env.PERF_FPS_INTERVAL, 10) : 500;
        const loop = () => {
            frame++;
            const frameTime = performance.now();
            const duration = frameTime - lastFrameTime;
            if (duration >= fpsReportInterval) {
                const fps = (frame * 1000) / duration;
                const fpsMessage = {
                    type: 'fps',
                    fps,
                    time: frameTime,
                    duration,
                    process: processName,
                };
                if (proxy.memoryUsage) {
                    fpsMessage.memory = proxy.memoryUsage();
                }
                if (proxy.cpuUsage) {
                    fpsMessage.cpu = proxy.cpuUsage();
                }
                proxy.send(fpsMessage);

                lastFrameTime = frameTime;
                frame = 0;

                if (fps < 59) {
                    console.log('%cPERF.fps', 'color:#f50057;font-weight:bold', fps);
                }
            }

            window.requestAnimationFrame(loop);
        };
        window.requestAnimationFrame(loop);
    }

    proxy.send({
        type: 'ready',
        time: performance.now(),
        now: Date.now(),
        process: processName,
    });

    global.cmdHandlers = cmdHandlers;
}

export default global.PERF;
