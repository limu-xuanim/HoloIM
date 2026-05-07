import type {encode} from 'iconv-lite';

export default {
    iconv: {
        encode: (async (...args) => {
            const {encode} = await import('iconv-lite');
            return encode(...args);
        }) satisfies PromiseReturn<typeof encode>,
    },
};
