import {forwardRef, useImperativeHandle, useState, type ForwardedRef, createRef} from 'react';
import {classes} from '~/app/utils/html-helper';
import fuid from '~/app/utils/fuid';
import Modal from '~/app/components/modal';
import Icon from '~/app/components/icon';
import MemberListItem from './member-list-item';
import SearchControl from '~/app/components/search-control';
import MembersSelect from './members-select';
import ChatListItem from '../chats/chat-list-item';
import DeptsMenu from './depts-menu';
import chatsStore from '~/app/core/im/chats-store';
import useLang from './use-lang';

type MembersSelectDialogProps = Partial<{
    selections: number[];
    excludes: number[];
    selectTip: string;
    scopes: Array<'depts' | 'groups'>;
    cgid: string;
}>;

export const MembersSelectDialog = forwardRef((props: MembersSelectDialogProps, ref: ForwardedRef<{selections: number[]}>) => {
    const [Lang]= useLang();
    const {cgid: _cgid = '', scopes = ['groups', 'depts'], selectTip = Lang.string('chat.create.groupsTip'), excludes, selections: _selections = []} = props;
    const [scope, setScope] = useState(scopes[0]);
    const [selections, setSelections] = useState(_selections);
    const [deptID, setDeptID] = useState(0)
    const [cgid, setCgid] = useState(() => scope === 'groups' ? _cgid : '');
    const [chatSearch, setChatSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectAll, setSelectAll] = useState(false);
    const [members, setMembers] = useState<number[]>([]);

    const handleDeptMenuSelect = (value: number) => {
        setDeptID(value);
    };

    const handleClickMember = (id: number) => {
        const selectionsSet = new Set(selections);
        if (selectionsSet.has(id)) {
            selectionsSet.delete(id);
        } else {
            selectionsSet.add(id);
        }
        const newSelections = Array.from(selectionsSet);
        setSelections(newSelections);
        setSelectAll(newSelections.length === members.length);
    };

    const handleMemberSearchChange = (value: string) => {
        setMemberSearch(value);
    };

    const handleSelectAll = () => {
        setSelectAll(!selectAll);
        setSelections(selectAll ? selections.filter(x => !members.includes(x)) : Array.from(new Set([...selections, ...members])));
    };

    const handleSelectInvert = () => {
        const addingMembers = members.filter(member => !selections.includes(member));
        const removingMembers = members.filter(member => selections.includes(member));
        const newSelections = Array.from(new Set([...selections, ...addingMembers].filter(x => !removingMembers.includes(x))));
        setSelectAll(members.every(x => newSelections.includes(x)));
        setSelections(newSelections);
    };

    const handleMembersChange = (value: number[]) => {
        setMembers(value);
        setSelectAll(value.every(x => selections.includes(x)))
    };

    const handleFilterByDept = () => {
        setScope('depts');
        setCgid('');
    };

    const handleFilterByGroup = () => {
        setScope('groups');
        setDeptID(0);
    };

    const handleChatSearchChange = (value: string) => {
        setChatSearch(value);
    };

    const handleChatSelect = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        setCgid(e.currentTarget.dataset.gid);
    };

    useImperativeHandle(ref, () => ({
        selections
    }), [selections]);


    return (
        <div className="app-members-select app-select-panel">
            <div className="dock-left single column divider-right" style={{width: 200, paddingLeft: 10, paddingRight: 10}}>
                <header className="-flex-none heading nav nav-tabs" style={{padding: '10px 0'}}>
                    {scopes.includes('groups') && <div className={classes('text-gray', {'btn btn-sm': scopes.length > 1, active: scopes.length > 1 && scope === 'groups'})} onClick={handleFilterByGroup}>{Lang.string('chat.create.filterByGroup')}</div>}
                    {scopes.includes('depts') && <div className={classes('text-gray', {'btn btn-sm': scopes.length > 1, active: scopes.length > 1 && scope === 'depts'})} onClick={handleFilterByDept}>{Lang.string('chat.create.filterByDept')}</div>}
                </header>
                {scope === 'groups' && (
                    <SearchControl
                        placeholder={Lang.string('common.search')}
                        onSearchChange={handleChatSearchChange}
                        style={{marginBottom: 6}}
                        changeDelay={500}
                    />
                )}
                <div className="-flex-auto -overflow-y-auto">
                    {scope === 'depts' && <DeptsMenu onSelectMenuItem={handleDeptMenuSelect} />}
                    {scope === 'groups' && (
                        <div className="app-chats-menu-list list compact">
                            {(chatSearch ? chatsStore.searchGroupChats(chatSearch) : chatsStore.getGroupsChats('recentFirst', false, false)).map((chat) => (
                                <ChatListItem
                                    onClick={handleChatSelect}
                                    onPointerDown={handleChatSelect}
                                    key={chat.gid}
                                    data-gid={chat.gid}
                                    gid={chat.gid}
                                    id={`membersSelectChatSearchListItem-${chat.gid}`}
                                    className={classes('item', {'primary-pale': cgid === chat.gid})}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div
                className="dock single column divider-right"
                style={{
                    left: 200, width: 200, paddingLeft: 10, paddingRight: 10
                }}
            >
                <header className="-flex-none">
                    <div className="title text-gray" style={{padding: '10px 0', lineHeight: '22px'}}>{selectTip}</div>
                    <SearchControl
                        placeholder={Lang.string('common.search')}
                        onSearchChange={handleMemberSearchChange}
                        style={{marginBottom: 6}}
                        changeDelay={500}
                    />
                </header>
                <div className="checkboxs-select">
                    <div
                        className={classes('btn btn-sm -rounded')}
                        onClick={handleSelectInvert}
                    >
                        {Lang.string('common.selectInverse')}<label />
                    </div>
                    <div
                        className={classes('checkbox checkbox-sm', {checked: selectAll})}
                        onClick={handleSelectAll}
                    >
                        {Lang.string('common.selectAll')}<label />
                    </div>
                </div>
                <div className="-flex-auto -overflow-y-auto">
                    <MembersSelect
                        cgid={cgid}
                        deptID={deptID}
                        excludes={excludes}
                        selections={selections}
                        searchValue={memberSearch}
                        onClickMember={handleClickMember}
                        onMembersChange={handleMembersChange}
                    />
                </div>
            </div>
            <div className="dock-right single column" style={{width: 200}}>
                <header className="-flex-none heading space-sm">
                    <div className="title text-primary">{Lang.string('chat.invite.choosed')} ({selections.length})</div>
                </header>
                <div className="list compact -overflow-y-auto">
                    {selections.map(memberID => (
                        <MemberListItem memberID={memberID} key={memberID} onClick={handleClickMember.bind(null, memberID)}>
                            <Icon name="sprite-selection-remove" />
                        </MemberListItem>
                    ))}
                </div>
            </div>
        </div>
    );
});

/**
 * 创建会话对话框组件
 */

type ShowMembersSelectDialogOptions = Partial<{
    cgid: string;
    selections: number[];
    excludes: number[];
    selectTip: string;
    scopes: Array<'depts' | 'groups'>;
    callback: (...args: any[]) => any;
    id: string;
    rejectWhenCancel: boolean;
}>;

/**
 * 显示用户选择对话框
 * @param options 选项
 * @param options.selections 已经选中的用户 ID 列表
 * @param options.excludes 排除的用户 ID 列表
 * @param options.selectTip 选择用户时的提示
 * @param options.id Dialog 窗口 ID
 * @param options.scopes 用户的来源范围，可选值为 depts, groups
 * @param  callback 显示完成后的回调函数
 * @returns 使用 Promise 返回结果
 */
export const showMembersSelectDialog = (options:ShowMembersSelectDialogOptions = {}, callback: (...arg: any) => any = null): Promise<number[]> => {
    const {selections = [], excludes = [], selectTip, id, scopes, rejectWhenCancel, cgid} = options;

    const dialogRef = createRef<{selections: number[]}>();

    return new Promise((resolve, reject) => {
        const modalID = id ?? fuid();

        Modal.show({
            enableBackdropClick: false,
            id: modalID,
            onSubmit: () => {
                if (!dialogRef.current) {
                    resolve([]);
                    return true;
                }
                const selectedMembers = dialogRef.current.selections;
                resolve(selectedMembers);
                return true;
            },
            onCancel: () => {
                if (rejectWhenCancel) {
                    reject(Error('cancel'));
                    return true;
                }
                resolve([]);
                return true;
            },
            closeButton: false,
            style: {width: 600, height: 500, overflow: 'hidden'},
            content: <MembersSelectDialog ref={dialogRef} cgid={cgid} selections={selections} excludes={excludes} selectTip={selectTip} scopes={scopes} />,
        }, callback);
    });
};

export default {
    show: showMembersSelectDialog,
};
