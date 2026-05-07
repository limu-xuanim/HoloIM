import {createInterface} from 'readline';

export function readProcessOutputByLine(out: NodeJS.ReadableStream, callback: (input: string) => void) {
    const rl = createInterface({
        input: out,
        terminal: false,
    });
    rl.on('line', callback);
    return rl;
}
