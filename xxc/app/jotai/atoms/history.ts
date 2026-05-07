import { atom } from "jotai";
import type { SearchChangeMap } from "~/app/views/chats/chats-history-header";

export const searchKeysAtom = atom('');
export const searchTimeAtom = atom<SearchChangeMap['time']>('oneMonth');
export const searchTypeAtom = atom<SearchChangeMap['type']>('choosed');
export const searchFileTypeAtom = atom<SearchChangeMap['filetype']>('');
