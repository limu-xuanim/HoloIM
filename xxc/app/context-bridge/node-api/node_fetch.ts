import {limitTimePromise} from '../../utils/promise';
import nodeFetch, {type RequestInit} from 'node-fetch';

export default {
    nodeFetchText: async (url: string, options: RequestInit = {}, timeout = 5000) => {
        const controller = new AbortController();
        try {
            const response = await limitTimePromise(nodeFetch(url, {signal: controller.signal, ...options}), timeout);
            const text = await response.text();
            return text;
        } catch (error) {
            return null;
        }
    }
};
