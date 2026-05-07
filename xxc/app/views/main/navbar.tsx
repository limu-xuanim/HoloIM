import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import NavbarUser from './navbar-user';
import NavbarMain from './navbar-main';

type NavbarProps = Partial<{
    className: string;
}>;

/**
 * 导航组件
 * @param props React 组件属性对象
 * @returns JSX.Element
 */
function Navbar(props: NavbarProps) {
    const {className} = props;

    return (
        <div className={classes('app-navbar -absolute -top-0 -left-0 -bottom-0 -right-auto -z-[1080]', className)} id="appNavbar">
            <div className="app-navbar-drag-area user-app-dragable -absolute -inset-0 -z-0 -ml-1" />
            <div className="app-navbar-main -absolute -top-0 -left-0 -right-0 -bottom-[50px] -flex -flex-col">
                <NavbarMain key="navbar-main" />
            </div>
            <NavbarUser className="-absolute -left-0 -right-0 -bottom-0" />
        </div>
    );
}

export default memo(Navbar);
