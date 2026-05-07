import {classes} from '../../utils/html-helper';
import DeptsTree from './depts-tree';
import ContactsView from './contacts-view';
import useLang from '../common/use-lang';
import {Link} from 'react-router-dom';

type ContactsHomeProps = {
    objectType: string;
    filterType: string;
} & Partial<{
    hidden: boolean;
    className: string;
}>;

/**
 * ContactsHome 组件 ，显示通讯录主界面
 */
export default function ContactsHome(props: ContactsHomeProps) {
    const {
        hidden = false,
        className,
        objectType,
        filterType,
        ...other
    } = props;
    const [Lang] = useLang();

    return (
        <div className={classes('dock app-contacts', className, {hidden})} {...other}>
            <header className="app-page-header heading dock dock-top user-app-dragable">
                <div className="title">{Lang.string('contacts')}</div>
            </header>
            <div className="app-contacts-side dock dock-left">
                <nav className="dock dock-top nav nav-pills nav-sm justified shadow-1">
                    <Link
                        to="/contacts/members"
                        className={classes({active: objectType === 'members'})}
                    >
                        {Lang.string('contacts.nav.members')}
                    </Link>
                </nav>
                <DeptsTree activeGroupID={filterType} className="dock -overflow-y-auto scrollbar-hover" />
            </div>
            <div className="app-contacts-main dock dock-right">
                <ContactsView deptID={filterType} />
            </div>
        </div>
    );
}
