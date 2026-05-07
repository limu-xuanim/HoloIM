import {useState, useEffect, useRef} from 'react';
import {caculateScore} from '../utils/string-helper';
import Icon from './icon';

type DataListOptions = Array<{
    label: string;
    value: string;
    score?: number;
}>;

type DataListProps = {
    options: DataListOptions;
    onChange: (label: string, value: string) => void;
    searchValue: string;
};

const getShowList = (searchValue: string, options: DataListOptions) => {
    if (!searchValue) {
        return options;
    }

    if (!searchValue.includes(' ')) {
        return options
            .map(x => ({
                label: x.label,
                value: x.value,
                score: caculateScore(searchValue, x.label),
            }))
            .filter(x => x.score > 0)
            .sort((x, y) => y.score - x.score);
    }

    const searchKeys = searchValue.split(' ');
    return options
        .map(x => ({
            label: x.label,
            value: x.value,
            score: searchKeys.reduce((previous, current) => previous + caculateScore(current, x.label), 0)
        }))
        .filter(x => x.score > 0)
        .sort((x, y) => y.score - x.score);
};

/**
 * 数据列表
 * @param props props
 * @returns 渲染结果
 */
function DataList(props: DataListProps) {
    const {options, onChange, searchValue} = props;
    const [showList, setShowList] = useState(getShowList(searchValue, options));

    useEffect(() => {
        setShowList(getShowList(searchValue, options));
    }, [searchValue, options]);

    return (
        <ul className="x-data-list list-none -m-0 -py-2 -pl-0 -bg-white -rounded-sm -absolute -min-h-[32px] -max-h-[240px] -overflow-y-auto -w-[480px] -z-50 -shadow-xl">
            {
                showList.map(({label, value}) => <li className="-pl-2 -leading-8 hover:-bg-[#f5f5f5]" key={value} onClick={() => {onChange(label, value);}}>{label}</li>)
            }
        </ul>
    );
}

type SearchBoxProps = {
    options: Array<{
        label: string;
        value: string;
    }>;
    onChange: (value: string) => void;
} & Partial<{
    defaultValue: string;
    placeholder: string;
}>;

/**
 * 带搜索框的 select
 * @param props props
 * @returns 渲染结果
 */
export function SearchBox(props: SearchBoxProps) {
    const {options, onChange, defaultValue, placeholder} = props;
    const [searchValue, setSearchValue] = useState(defaultValue ?? '');
    const [isFocus, setFocus] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const labels = options.map(x => x.label);

    const handleItemClick = (label: string, value: string) => {
        setSearchValue(label);
        onChange(value);
        setFocus(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        setSearchValue(e.target.value);
        setFocus(true);
        if (labels.some(x => x === value)) {
            onChange(value);
        } else {
            onChange(null);
        }
    };

    const handleInputBlur = () => {
        setTimeout(() => setFocus(false), 800);
    };

    const handleInputClear = () => {
        setSearchValue('');
        input.current.focus();
    };

    const inputIconClassName = '-absolute -right-0 -top-0 -h-[26px] -w-[26px] -flex -justify-center -items-center';

    return (
        <div className="x-search-box">
            <div className="-relative">
                <input
                    className="input -rounded"
                    onChange={handleInputChange}
                    onFocus={() => setFocus(true)}
                    onBlur={handleInputBlur}
                    value={searchValue}
                    ref={input}
                    placeholder={placeholder}
                />
                {
                    searchValue
                        ? <Icon name="mdi-close" className={`${inputIconClassName} -cursor-pointer`} onClick={handleInputClear} />
                        : <Icon name="mdi-chevron-down" className={inputIconClassName} style={{fontSize: '1rem'}} />
                }
            </div>
            {
                isFocus
                    ? <DataList options={options} onChange={handleItemClick} searchValue={searchValue} />
                    : null
            }
        </div>
    );
}
