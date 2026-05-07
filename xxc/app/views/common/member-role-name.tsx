import {memo} from 'react';
import useRoleName from './use-role-name';

type MemberRoleNameProps = {role: string;}
    & Partial<{span: boolean;}>
    & React.HTMLAttributes<HTMLDivElement|HTMLSpanElement>;

/**
 * 成员角色名称组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.role 角色代号
 * @param props.span 是否渲染为 <span>
 * @returns React Node content
 */
function MemberRoleName(props: MemberRoleNameProps) {
    const {role, span = false, ...other} = props;
    const roleName = useRoleName(role);
    const showRole = roleName || role;
    if (span) {
        return <span {...other} title={showRole}>{showRole}</span>;
    }
    return <div {...other} title={showRole}>{showRole}</div>;
}

export default memo(MemberRoleName);
