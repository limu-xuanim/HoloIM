import React, {memo} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import Button from '../../components/button';
import platform from '../../platform';
import useLang from './use-lang';

/**
 * 对话框操作按钮组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param {Object} props React 组件属性对象
 * @param {string|array|Record<string, any>} [props.className] React 组件属性对象
 * @param {string} [props.primaryBtnText] React 组件属性对象
 * @param {string} [props.cancelBtnText] React 组件属性对象
 * @param {string} [props.primaryBtnClassName] React 组件属性对象
 * @param {string} [props.cancelBtnClassName] React 组件属性对象
 * @param {function} [props.onClickPrimary] React 组件属性对象
 * @param {function} [props.onClickCancel] React 组件属性对象
 * @returns {JSX.Element} React Node content
 */
function DialogActionButtons(props) {
    const {
        className,
        primaryBtnText,
        cancelBtnText,
        primaryBtnClassName,
        cancelBtnClassName,
        onClickPrimary,
        onClickCancel,
    } = props;

    const [Lang] = useLang();

    const buttons = [
        <Button disabled={!onClickPrimary} key="btn-confirm" className={primaryBtnClassName} onClick={onClickPrimary} label={primaryBtnText || Lang.string('common.confirm')} />,
        <Button key="btn-cancel" className={cancelBtnClassName} onClick={onClickCancel} label={cancelBtnText || Lang.string('common.cancel')} />
    ];
    if (platform.env.isOSX) {
        buttons.reverse();
    }

    return <div className={classes('actions toolbar', className)}>{buttons}</div>;
}

/**
 * React 组件属性类型检查
 * @see https://zh-hans.reactjs.org/docs/typechecking-with-proptypes.html
 * @type {Record<string, PropTypes.Validator>}
 */
DialogActionButtons.propTypes = {
    className: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]),
    primaryBtnText: PropTypes.string,
    cancelBtnText: PropTypes.string,
    primaryBtnClassName: PropTypes.string,
    cancelBtnClassName: PropTypes.string,
    onClickPrimary: PropTypes.func,
    onClickCancel: PropTypes.func,
};

/**
 * React 组件默认属性
 * @see https://zh-hans.reactjs.org/docs/react-component.html#defaultprops
 * @type {Record<string, any>}
 */
DialogActionButtons.defaultProps = {
    className: '-text-center has-padding-lg',
    primaryBtnText: null,
    cancelBtnText: null,
    primaryBtnClassName: 'btn-wide bg-primary -rounded',
    cancelBtnClassName: 'gray x-outline cancel-btn btn-wide -rounded',
    onClickPrimary: null,
    onClickCancel: null,
};

export default memo(DialogActionButtons);
