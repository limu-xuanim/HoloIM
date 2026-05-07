const docCookies = {
    get: window.electronAPI.cookiesGet,
    set: window.electronAPI.cookiesSet,
    remove: window.electronAPI.cookiesRemove,
};

export default docCookies;
