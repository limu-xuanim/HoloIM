import React, {memo} from 'react';
import useDept from './use-dept';

type MemberDeptNameDivProps = Partial<{span: false;}> & React.HTMLAttributes<HTMLDivElement>;
type MemberDeptNameSpanProps = {span: true;} & React.HTMLAttributes<HTMLSpanElement>;

type MemberDeptNameProps = {id: number;}
    & (MemberDeptNameDivProps|MemberDeptNameSpanProps);

/**
 * 成员角色名称组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.id 部门 ID
 * @param props.span 是否渲染为 <span>
 * @returns React Node content
 */
function MemberDeptName(props: MemberDeptNameProps) {
    const {id, span = false, ...other} = props;
    const dept = useDept(id);
    if (span) {
        return <span {...other}>{dept ? dept.name : ''}</span>;
    }
    return <div {...other}>{dept ? dept.name : ''}</div>;
}

export default memo(MemberDeptName);
