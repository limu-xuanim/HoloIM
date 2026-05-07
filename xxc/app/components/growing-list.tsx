import {useState, memo, isValidElement, type ReactNode} from 'react';
import {classes} from '../utils/html-helper';
import {formatString} from '../utils/string-helper';
import Icon from './icon';
import {renderIf} from '../utils/render';

export type LoadMoreInfo = {
    morePageSize: number;
    loadedCount: number;
    totalCount: number;
    nextCount: number;
};

export type GrowingListProps = {
    itemRender: (index: number, count: number) => JSX.Element;
    count: number;
    className?: string;
    startPageSize?: number;
    morePageSize?: number;
    loadMoreText?: string | ReactNode | ((info: LoadMoreInfo) => ReactNode);
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * 支持逐页加载更多的列表
 * @param props React 组件属性对象
 * @param props.count 列表项数目
 * @param props.startPageSize 开始显示的数目
 * @param props.morePageSize 请求加载更多一次加载的数目
 * @param props.loadMoreText 请求加载更多的提示文本
 * @param props.itemRender 列表项渲染方法
 * @param props.className 类名
 * @returns JSX.Element
 */
function GrowingList(props: GrowingListProps) {
    const {
        className,
        count,
        startPageSize = 20,
        morePageSize = 20,
        loadMoreText,
        itemRender,
        ...others
    } = props;

    // 已显示的数目
    const [loadedCount, setLoadedCount] = useState(Math.min(startPageSize, count));
    const actualLoadCount = Math.max(Math.min(startPageSize, count), loadedCount);
    const showLoadMore = actualLoadCount < count;

    let loadMoreView: ReactNode = null;
    if (showLoadMore) {
        const loadInfo = {
            morePageSize, loadedCount: actualLoadCount, totalCount: count, nextCount: Math.min(morePageSize, count - actualLoadCount)
        };
        if (typeof loadMoreText === 'function') {
            loadMoreView = loadMoreText(loadInfo);
        } else if (typeof loadMoreText === 'string') {
            loadMoreView = formatString(loadMoreText, loadInfo);
        } else if (isValidElement(loadMoreText)) {
            loadMoreView = loadMoreText;
        } else {
            loadMoreView = <Icon name="chevron-double-down" />;
        }
    }

    const handleLoadMoreClick = showLoadMore
        ? () => {
            setLoadedCount(Math.min(actualLoadCount + morePageSize, count));
        }
        : null;

    const itemsView: ReactNode[] = [];
    for (let i = 0; i < actualLoadCount; ++i) {
        itemsView.push(itemRender(i, actualLoadCount));
    }

    return (
        <div className={classes('growing-list', className)} {...others}>
            {itemsView}
            {renderIf(loadMoreView) && (
                <a className="growing-list-load-more" onClick={handleLoadMoreClick}>{loadMoreView}</a>
            )}
        </div>
    );
}

export default memo(GrowingList);
