import { memo, useRef, useState } from 'react';
import { classes } from '~/app/utils/html-helper';
import SearchControl from '~/app/components/search-control';
import SelectBox from '~/app/components/select-box';
import Icon from '~/app/components/icon';
import useLang from '../common/use-lang';
import useHistoryFetchingStatus from './use-history-fetching-status';
import Button from '~/app/components/button';
import { showContextMenuWithItems } from '~/app/core/context-menu-independent';
import { getContextMenuItems } from '~/app/entries/vars/getContextMenuItems';
import { FetchHistoryEventsModule } from '~/app/entries/vars/FetchHistoryEventsModule';
import { useAtom } from 'jotai';
import { searchFileTypeAtom, searchKeysAtom, searchTimeAtom, searchTypeAtom } from '~/app/jotai/atoms/history';

const abortSyncHistory = FetchHistoryEventsModule.abortSyncHistory;

export type SearchChangeMap = {
    keys: string;
    time: 'oneWeek' | 'oneMonth' | 'threeMonth' | 'halfYear' | 'oneYear' | '';
    type: 'choosed' | 'contacts' | 'groups' | '';
    filetype: '' | '[image]' | '[text]';
};

type ChatsHistoryHeaderProps = {
    searchingTip: string;
    searchProgress: number;
    selectedChat: string;
    className?: string;
};

/**
 * 历史记录界面头部
 * @param props React 组件属性对象
 * @param props.className 类名
 * @param props.searchingTip 搜索提示文本
 * @param props.searchProgress 搜索进度
 * @param props.onSearchChange 搜索设置变更回调函数
 * @returns JSX.Element
 */
function ChatsHistoryHeader(props: ChatsHistoryHeaderProps) {
    const {
        className,
        searchingTip,
        searchProgress,
        selectedChat = '',
        ...others
    } = props;

    const [chatType, setChatType] = useState('currentChat');
    const { fetching, progress } = useHistoryFetchingStatus();
    const [Lang] = useLang();

    const [searchKeys, setSearchKeys] = useAtom(searchKeysAtom);
    const [searchTimeFilter, setSearchTimeFilter] = useAtom(searchTimeAtom);
    const [searchTypeFilter, setSearchTypeFilter] = useAtom(searchTypeAtom);
    const [searchFileTypeFilter, setSearchFileTypeFilter] = useAtom(searchFileTypeAtom);

    /**
     * 处理同步会话类型选择事件
     * @param e 点击事件
     */
    const handleMenuTypeBtnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const triggerElement = (e.target as HTMLElement).closest('.btn');
        const options = {
            event: e,
            setChatType,
            chatType,
            options: {
                preventDefault: true,
                stopPropagation: true,
                position: {
                    direction: 'below-left',
                    triggerElement,
                }
            }
        };
        const menuItems = getContextMenuItems('chats.sync.type.menu', options);
        showContextMenuWithItems('chats.sync.type.menu', menuItems, options);
    };

    const handleFetchMessagesClicked = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        const options = { event, params: [] as string[] };
        if (chatType !== 'allChats') options.params = [selectedChat];
        const menuItems = getContextMenuItems('chats.history.fetchAllButton', options);
        showContextMenuWithItems('chats.history.fetchAllButton', menuItems, options);
    };

    const searchTimeOptionsRef = useRef([
        { label: Lang.string('time.oneWeek'), value: 'oneWeek' },
        { label: Lang.string('time.oneMonth'), value: 'oneMonth' },
        { label: Lang.string('time.threeMonth'), value: 'threeMonth' },
        { label: Lang.string('time.halfYear'), value: 'halfYear' },
        { label: Lang.string('time.oneYear'), value: 'oneYear' },
        { label: Lang.string('time.all'), value: '' },
    ]);
    const searchTypeOptionsRef = useRef([
        { label: Lang.string('chats.history.search.type.choosed'), value: 'choosed' },
        { label: Lang.string('chats.history.search.type.contacts'), value: 'contacts' },
        { label: Lang.string('chats.history.search.type.groups'), value: 'groups' },
        { label: Lang.string('chats.history.search.type.all'), value: '' },
    ]);
    const searchFileTypeOptionsRef = useRef([
        { label: Lang.string('chats.history.search.filetype.all'), value: '' },
        { label: Lang.string('chats.history.search.filetype.text'), value: '[text]' },
        { label: Lang.string('chats.history.search.filetype.image'), value: '[image]' },
    ]);

    return (
        <div className={classes('app-chats-history-header heading app-titlebar-drag-area user-app-dragable -flex -items-center', className)} {...others}>
            <div className="-flex-auto search-control row -items-center">
                <SearchControl
                    disabled={fetching}
                    changeDelay={500}
                    defaultValue={searchKeys}
                    onSearchChange={setSearchKeys}
                    placeholder={Lang.string('chats.history.search.placeholder')}
                >
                    <SelectBox
                        value={searchTypeFilter}
                        onChange={setSearchTypeFilter}
                        options={searchTypeOptionsRef.current}
                        className="search-box-type dock dock-right small"
                        selectClassName="-rounded"
                    />
                    <SelectBox
                        value={searchTimeFilter}
                        onChange={setSearchTimeFilter}
                        options={searchTimeOptionsRef.current}
                        className="search-box-time dock dock-right small"
                        selectClassName="-rounded"
                    />
                    <SelectBox
                        value={searchFileTypeFilter}
                        onChange={setSearchFileTypeFilter}
                        options={searchFileTypeOptionsRef.current}
                        className="search-box-filetype dock dock-right small"
                        selectClassName="-rounded"
                    />
                </SearchControl>
                {
                    searchingTip
                        ? (
                            <div className="search-control-tip">
                                <small className="muted">{searchingTip}</small>
                                <div className="progress"><div className="bar" style={{ width: `${searchProgress}%` }} /></div>
                            </div>
                        )
                        : null
                }
            </div>
            <nav className="-flex-none nav hint--bottom-right" data-hint={Lang.string('chats.history.fetchAllFromServer')}>
                {
                    fetching
                        ? (
                            <a onClick={abortSyncHistory}>
                                <Icon name="sync spin" /> &nbsp;
                                <small>{Lang.string('chats.history.fetchingMessages')} {Math.floor(progress)}%</small>
                            </a>
                        )
                        : (
                            <a onClick={handleFetchMessagesClicked} className="text-primary">
                                <Icon name="cloud-sync" /> &nbsp; {Lang.string('chats.history.fetchAll')}
                                <Button className="-rounded app-chats-menu-type-btn -p-0" onClick={handleMenuTypeBtnClick}>
                                    <Icon name="chevron-down" />
                                </Button>
                            </a>
                        )
                }
            </nav>
        </div>
    );
}

export default memo(ChatsHistoryHeader);
