import dns from 'node:dns';

export default {
    dnsGetServers: dns.getServers,
    dnsLookupPromise: dns.promises.lookup,
};
