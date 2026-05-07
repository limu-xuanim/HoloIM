import {atom} from 'jotai';
import {Language} from '~/app/constants';
import type {ValueOf} from '~/app/@types/common';

/** 当前语言 atom */
const langAtom = atom<ValueOf<typeof Language>>(Language.zhCN);

export default langAtom;
