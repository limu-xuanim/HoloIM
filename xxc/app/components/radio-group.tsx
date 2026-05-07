import {memo} from 'react';
import {classes} from '../utils/html-helper';
import fuid from '../utils/fuid';
import Radio, {type RadioProps} from './radio';

type RadioGroupProp = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>
    &Partial<{
        checked: string|false;
        items: RadioProps[];
        name: string;
        className: string;
        radioProps: RadioProps;
        onChange: (value: string, event: React.FormEvent<HTMLDivElement>) => void;
        children: React.ReactNode;
        label: React.ReactNode;
    }>;

/**
 * RadioGroup 组件 ，显示一个单选组
 * @param props React 组件属性对象
 * @param props.checked 选中状态
 * @param props.items 子项
 * @param props.name 名称
 * @param props.className 样式类名
 * @param props.radioProps 其他属性
 * @param props.onChange 状态改变回调
 * @param props.children 子组件
 * @param props.label 标签
 * @returns React Node
 */
function RadioGroup(props: RadioGroupProp) {
    const {
        name,
        items,
        checked = false,
        children,
        className,
        radioProps,
        onChange,
        ...other
    } = props;

    const groupName = name || fuid();

    return (
        <div className={classes('radio-group', className)} {...other} onChange={e => onChange?.((e.target as HTMLInputElement).value, e)}>
            {
                items?.map(item => {
                    const {
                        label,
                        value,
                        ...itemOther
                    } = item;
                    return (
                        <Radio
                            key={value}
                            name={groupName}
                            label={label}
                            value={value}
                            checked={checked === value}
                            {...itemOther}
                            {...radioProps}
                        />
                    );
                })
            }
            {children}
        </div>
    );
}

export default memo(RadioGroup);
