import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import lang from '../../core/lang';
import SelectPanel from './select-panel';
import Button from '../../components/button';
import platform from '../../platform';

/**
 * 检查应用运行的操作系统类型是否是 macOS
 * @type {boolean}
 * @private
 * @constant
 */
const {isOSX} = platform.env;

/**
 * SelectPanelWithActions 组件 ，显示带有回调的选择面板
 */
export default class SelectPanelWithActions extends PureComponent {
    static propTypes = {
        onFinish: PropTypes.func,
        primaryBtnText: PropTypes.string,
        cancelBtnText: PropTypes.string,
        message: PropTypes.object,
        header: PropTypes.element,
    };

    static defaultProps = {
        onFinish: null,
        primaryBtnText: '',
        cancelBtnText: '',
        message: null,
        header: null,
    };

    constructor(props) {
        super(props);

        this.state = {
            selections: null
        };
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    /**
     * 处理选择面板选中结果变更事件
     * @param {Object[]} selections 选中结果
     * @returns {void}
     */
    handleSelectionsChange = (selections) => {
        if (!this._unmounted) {
            this.setState({selections});
        }
    };

    /**
     * 处理确认按钮点击事件
     *
     * @returns {void}
     */
    handleConfirmBtnClick = () => {
        const {onFinish} = this.props;
        if (onFinish) {
            const {selections} = this.state;
            onFinish(selections);
        }
    };

    /**
     * 处理取消按钮点击事件
     *
     * @returns {void}
     */
    handleCancelBtnClick = () => {
        const {onFinish} = this.props;
        if (onFinish) {
            onFinish();
        }
    };

    render() {
        const {
            onFinish,
            primaryBtnText,
            cancelBtnText,
            header,
            ...others
        } = this.props;

        const {selections} = this.state;

        const buttons = [
            <Button disabled={!selections || !selections.length} key="btn-confirm" className="btn-wide bg-primary -rounded" onClick={this.handleConfirmBtnClick} label={primaryBtnText || lang.string('common.confirm')} />,
            <Button key="btn-cancel" className="gray x-outline cancel-btn btn-wide -rounded" onClick={this.handleCancelBtnClick} label={cancelBtnText || lang.string('common.cancel')} />
        ];
        if (isOSX) {
            buttons.reverse();
        }
        return (
            <div>
                {header}
                <SelectPanel onSelectionsChange={this.handleSelectionsChange} {...others}>
                    <div className="actions toolbar dock-bottom divider-top -text-center has-padding-lg">{buttons}</div>
                </SelectPanel>
            </div>
        );
    }
}
