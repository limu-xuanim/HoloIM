import useLang from '../views/common/use-lang';
import Icon from './icon';

export interface ColDefinition<RowData extends { key: string }> {
    title: string;
    dataIndex: keyof RowData;
    canSort?: boolean;
    defaultSortOrder?: 'asc' | 'desc';
    render?: (record: RowData, Lang: LangHelper) => JSX.Element | string;
    align?: 'left' | 'center' | 'right';
}

export enum SortDirection {
    asc = 'asc',
    desc = 'desc'
}

export type SortParam<RowData> = `${Exclude<keyof RowData, symbol>}_${SortDirection}`

export type RowCallbackProps<RowData extends { key: string }> = {
    onClick?: (event: React.MouseEvent, record: RowData) => void;
    onContextMenu?: (event: React.MouseEvent, record: RowData) => void;
};

export type CellCallbackProps<RowData extends { key: string }> = {
    onClick?: (event: React.MouseEvent, record: RowData, column: ColDefinition<RowData>) => void;
    onContextMenu?: (event: React.MouseEvent, record: RowData, column: ColDefinition<RowData>) => void;
};

Table.defaultProps = {
    dataSource: null,
    loading: false,
    onRow: null,
    onCell: null,
    defaultRows: 10,
    sortedColumn: null,
    onHeaderClick: null,
    noDataElement: null
};

function getAlignClass(align: 'left' | 'center' | 'right') {
    switch (align) {
        case 'left':
            return 'align-left';
        case 'center':
            return 'align-center';
        case 'right':
            return 'align-right';
        default:
            return 'align-left';
    }
}

export function Table<RowData extends { key: string }>({dataSource, columns, loading = false, onRow, onCell, defaultRows = 10, sortedColumn, onHeaderClick, noDataElement}: {
    dataSource?: RowData[];
    columns: ColDefinition<RowData>[];
    loading?: boolean;
    onRow?: RowCallbackProps<RowData>;
    onCell?: CellCallbackProps<RowData>;
    defaultRows?: number;
    sortedColumn?: SortParam<RowData>;
    onHeaderClick?: (dataIndex: keyof RowData) => void;
    noDataElement?: string | JSX.Element;
}) {
    const [Lang] = useLang();
    const tableHeader = (
        <thead>
            <tr>
                {columns.map((column) => {
                    let iconName = null;
                    let sortIcon = null;
                    if (column.canSort) {
                        if (sortedColumn) {
                            const [dataIndex, sortDirection] = sortedColumn.split('_');
                            if (column.dataIndex === dataIndex) {
                                if (sortDirection === SortDirection.asc) {
                                    iconName = 'chevron-up';
                                } else {
                                    iconName = 'chevron-down';
                                }
                            } else {
                                iconName = 'unfold-more-horizontal';
                            }
                        } else {
                            iconName = 'unfold-more-horizontal';
                        }
                        sortIcon = <Icon name={`mdi-${iconName}`} className="-top-1" />;
                    }
                    return (
                        <th key={column.title} onClick={() => column.canSort && onHeaderClick && onHeaderClick(column.dataIndex)}><span className={sortIcon ? '-top-2' : ''}>{Lang.string(column.title)}</span>{sortIcon}</th>
                    );
                })}
            </tr>
        </thead>
    );

    if (noDataElement && typeof noDataElement === 'string') {
        noDataElement = <tr><td colSpan={columns.length} className="-text-center">{noDataElement}</td></tr>;
    }

    const body = loading || !dataSource
        ? [...Array(defaultRows).keys()].map((key) => (
            <tr key={key}>
                {columns.map((column) => (
                    <td key={`loading-holder-${column.title}`} className="has-padding"><div className="loading-holder -relative loading-holder-line load-holder-height" /></td>))}
            </tr>
        ))
        : (
            noDataElement && !dataSource.length
                ? noDataElement
                : dataSource.map((record) => (
                    <tr
                        key={record.key}
                        onClick={e => onRow && onRow.onClick && onRow.onClick(e, record)}
                        onContextMenu={e => onRow && onRow.onContextMenu && onRow.onContextMenu(e, record)}
                    >
                        {columns.map(column => (
                            <td key={`${record.key}-${column.title}`} className={getAlignClass(column.align)}>
                                <span
                                    onClick={e => onCell && onCell.onClick && onCell.onClick(e, record, column)}
                                    onContextMenu={e => onCell && onCell.onContextMenu && onCell.onContextMenu(e, record, column)}
                                >{column.render ? column.render(record, Lang) : record[column.dataIndex]}
                                </span>
                            </td>
                        ))}
                    </tr>
                ))
        );

    return (
        <table className="table table-component">
            {tableHeader}
            <tbody>{body}</tbody>
        </table>
    );
}
