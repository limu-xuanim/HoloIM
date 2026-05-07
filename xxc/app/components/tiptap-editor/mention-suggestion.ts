import {ReactRenderer} from '@tiptap/react';
import type {Editor} from '@tiptap/core/dist/packages/core/src/Editor';
import type {SuggestionKeyDownProps, SuggestionProps, SuggestionOptions} from '@tiptap/suggestion';
import MentionMembers from '~/app/components/tiptap-editor/mention-members';
import tippy from 'tippy.js';
import {getRecentMembersOfGroupChat} from '~/app/core/im/im-ui';
import membersStore from '~/app/core/members/members-store';
import Member from '~/app/core/members/member';
import Lang from '~/app/core/lang';

type Options = {
    limit: number;
    chat: Chat;
};

const getRectOfAnchorPos = (editor: Editor) => {
    const pos = editor.state.selection.$anchor.pos;
    const coords = editor.view.coordsAtPos(pos)
    const {top, right, bottom, left} = coords;
    const rect = new DOMRect(left, top, right - left, bottom - top);
    return rect;
};

export default function createSuggestion(options: Options): Omit<SuggestionOptions<Member>, "editor"> {
    const {limit, chat} = options;
    const cgid = chat.gid;

    return {
        allowedPrefixes: null,
        items: async ({query}) => {
            let members: (Member | undefined)[];
            if (!query) {
                const ids = getRecentMembersOfGroupChat(cgid, {limit}).filter((id): id is number => id !== undefined);
                members = membersStore.getMembers(ids) || [];
                if (chat.isGroupOrSystem) {
                    members.unshift(new Member({
                        id: -999,
                        realname: Lang.string('chat.message.atAll'),
                    }));
                }
            } else {
                members = await membersStore.searchFromRemote(query, {limit, chat: cgid}) || [];
            }

            // TODO: some time members will include a null value.
            return members.filter((m): m is Member => Boolean(m));
        },
        render: () => {
            let component: ReactRenderer<{onKeyDown: (props: SuggestionKeyDownProps) => boolean;}, SuggestionProps>;
            let popup: ReturnType<typeof tippy>;

            return {
                onStart: (props) => {
                    component = new ReactRenderer<{onKeyDown: (props: SuggestionKeyDownProps) => boolean;}, SuggestionProps>(MentionMembers, {
                        props: {
                            ...props,
                            chat,
                            backspace: () => {
                                const pos = props.editor.state.selection.$anchor.pos;
                                props.editor
                                    .chain()
                                    .deleteRange({from: pos - 1, to: pos})
                                    .run();
                            },
                        },
                        editor: props.editor,
                        className: 'white'
                    });

                    if (!props.clientRect) {
                        props.clientRect = () => getRectOfAnchorPos(props.editor);
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'top-start',
                    });
                },
                onUpdate(props) {
                    component?.updateProps(props);

                    if (!props.clientRect) {
                        props.clientRect = () => getRectOfAnchorPos(props.editor);
                    }

                    popup?.[0]?.setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },

                onKeyDown(props) {
                    if (props.event.key === 'Escape') {
                        popup?.[0]?.hide();

                        return true;
                    }

                    if (!document.querySelector('body > [data-tippy-root]')) {
                        return false;
                    }

                    return component.ref.onKeyDown(props);
                },

                onExit() {
                    popup?.[0]?.destroy();
                    component?.destroy();
                },
            };
        },
    };
}
