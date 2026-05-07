import {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import type {SuggestionKeyDownProps, SuggestionProps} from '@tiptap/suggestion';
import { isNotEmptyArray } from '../../utils/check-empty';
import {classes} from '../../utils/html-helper';
import MemberAvatar from '~/app/views/common/member-avatar';
import Avatar from '../avatar';
import useLang from '~/app/views/common/use-lang';

export default forwardRef((props: SuggestionProps<Member> & {
    chat: Chat;
    backspace: () => void;
}, ref) => {
    const {chat, items: members, backspace} = props;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [Lang] = useLang();
    const cgid = chat.gid;

    const selectItem = (index: number) => {
        const item = members[index];

        if (item) {
            const executeCommand = (props.command as unknown as (result: {id: string; label: string}) => void);
            executeCommand({id: item.displayName, label: item.displayName});
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + members.length - 1) % members.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % members.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: 候选成员变更时应该将所选成员置为第一个
    useEffect(() => setSelectedIndex(0), [members]);

    useEffect(() => {
        document.querySelector(`.suggestion-item-${selectedIndex}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({event}: SuggestionKeyDownProps) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                const reactRenderer = document.querySelector('body > [data-tippy-root] .react-renderer');
                if (reactRenderer?.children.length !== 0) {
                    enterHandler();
                    return true;
                }
            }

            return false;
        },
    }));

    if (!isNotEmptyArray(members)) {
        return null;
    }

    return (
        <div className="app-mention-suggest-panel -rounded-sm -max-h-56 -overflow-y-auto">
            {
                chat.isGroupOrSystem
                    ? (
                        <div className="suggest-title -flex -justify-between white -w-full -px-2 -py-1">
                            <span className="x-text-black small">{Lang.string('chat.group.members')}</span>
                            <a
                                href={`xxc://showChatMentionsDialog/${cgid}`}
                                className="text-primary small -rounded"
                                onClick={backspace}
                            >
                                {Lang.string('common.more')}
                            </a>
                        </div>
                    )
                    : null
            }
            {
                <div className="-flex -flex-col -flex-nowrap -items-start white">
                    {
                        members.map((member, index) => (
                            <a
                                key={`SuggestionItem-${member.id}`}
                                className={classes('-flex -items-center -w-28 -p-1 -gap-2', {primary: index === selectedIndex}, `suggestion-item-${index}`)}
                                onClick={() => selectItem(index)}
                            >
                                {
                                    member.id === -999
                                        ? <Avatar label="@" foreColor="#fff" className="-rounded-full -bg-[var(--color-primary)] -flex-shrink-0" style={{width: 24, height: 24}} />
                                        : <MemberAvatar className="-flex-shrink-0" showStatusDot memberID={member.id} />
                                }
                                <div className="title x-text-ellipsis">{member.displayName}</div>
                            </a>
                        ))
                    }
                </div>
            }
        </div>
    )
});
