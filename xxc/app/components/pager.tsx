import {classes} from '../utils/html-helper';
import useLang from '../views/common/use-lang';
import Icon from './icon';

type PagerProps = React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        page: number;
        recTotal: number;
        recPerPage: number;
        pageRecCount: number;
        pageTotal: number|false;
        showFirstLast: 'auto'|boolean;
        className: string;
        hintClass: string;
        onPageChange: (page: number) => void;
        reversed: boolean;
    }>;

export default function Pager(props: PagerProps) {
    const {
        page = 1,
        recTotal = 0,
        recPerPage = 20,
        pageTotal = false,
        onPageChange,
        className,
        pageRecCount = 0,
        showFirstLast = 'auto',
        hintClass = 'hint--bottom',
        reversed = false,
        ...other
    } = props;
    const [Lang] = useLang();
    const totalPage = pageTotal || Math.ceil(recTotal / recPerPage);

    /**
     * 处理上一页按钮点击事件
     */
    const handlePrevBtnClick = () => {
        if (onPageChange && page > 1) {
            onPageChange(page - 1);
        }
    };

    /**
     * 处理下一页按钮点击事件
     */
    const handleNextBtnClick = () => {
        if (onPageChange && page < totalPage) {
            onPageChange(page + 1);
        }
    };

    /**
     * 处理第一页按钮点击事件
     */
    const handleFirstBtnClick = () => {
        if (onPageChange && page > 1) {
            onPageChange(1);
        }
    };

    /**
     * 处理最后一页按钮点击事件
     */
    const handleLastBtnClick = () => {
        if (onPageChange && page < totalPage) {
            onPageChange(totalPage);
        }
    };

    const [nextDisabled, prevDisabled] = reversed ? [page <= 1, page >= totalPage] : [page >= totalPage, page <= 1];

    let firstView: JSX.Element;
    let lastView: JSX.Element;
    if (showFirstLast && (showFirstLast === true || totalPage > 5)) {
        firstView = (
            <div className={hintClass} data-hint={Lang.string('pager.first')}>
                <button
                    disabled={prevDisabled}
                    type="button"
                    className="iconbutton btn -rounded"
                    onClick={reversed ? handleLastBtnClick : handleFirstBtnClick}
                >
                    <Icon name="chevron-double-left" />
                </button>
            </div>
        );
        lastView = (
            <div className={hintClass} data-hint={Lang.string('pager.last')}>
                <button
                    disabled={nextDisabled}
                    type="button"
                    className="iconbutton btn -rounded"
                    onClick={reversed ? handleFirstBtnClick : handleLastBtnClick}
                >
                    <Icon name="chevron-double-right" />
                </button>
            </div>
        );
    }

    return (
        <div {...other} className={classes('pager -flex -items-center', className)}>
            {firstView}
            <div className={hintClass} data-hint={Lang.string('pager.prev')}>
                <button
                    disabled={prevDisabled}
                    type="button"
                    className="iconbutton btn -rounded"
                    onClick={reversed ? handleNextBtnClick : handlePrevBtnClick}
                >
                    <Icon name="chevron-left" />
                </button>
            </div>
            {
                recTotal
                    ? (
                        <div
                            className={hintClass}
                            data-hint={pageRecCount
                                ? `${(page - 1) * recPerPage + 1} ~ ${Math.min(recTotal, (page - 1) * recPerPage + pageRecCount)} / ${recTotal}`
                                : null}
                        >
                            <strong>{reversed ? totalPage - page + 1 : page}</strong> / <strong>{totalPage}</strong>
                        </div>
                    )
                    : null
            }
            <div className={hintClass} data-hint={Lang.string('pager.next')}>
                <button
                    disabled={nextDisabled}
                    type="button"
                    className="iconbutton btn -rounded"
                    onClick={reversed ? handlePrevBtnClick : handleNextBtnClick}
                >
                    <Icon name="chevron-right" />
                </button>
            </div>
            {lastView}
        </div>
    );
}
