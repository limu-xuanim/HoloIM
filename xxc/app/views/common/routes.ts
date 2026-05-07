/**
 * 路由名称配置表
 */
export default {
    chats: {
        _: '/chats',
        __: '/chats/:filterType/:id?',
        chat: {
            __: '/chats/:filterType/:id',
            id: (id: string, filterType: string) => (`/chats/${filterType || ':filterType'}/${id}`)
        },
        recents: {
            __: '/chats/recents',
            id: (id: string) => (`/chats/recents/${id}`)
        },
        contacts: {
            __: '/chats/contacts',
            id: (id: string) => (`/chats/contacts/${id}`)
        },
        groups: {
            __: '/chats/groups',
            id: (id: string) => (`/chats/groups/${id}`)
        }
    },
    contacts: {
        _: '/contacts',
        __: '/contacts/:objectType?/:filterType?',
    },
    apps: {
        __: '/:app/:filterType?/:id?/:params?',
    },
} as const;
