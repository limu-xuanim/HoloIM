type AnyFunction = (...args: any[]) => any;
type AnyVoidFunction = (...args: any[]) => void;
type voidFunction = () => void;

type DateLike = Date | number | string;
type Nullish = undefined | null;

/**
 * 选出对象中的可选属性的键，并使其成为联合类型
 * @see https://stackoverflow.com/questions/53899692/typescript-how-to-extract-only-the-optional-keys-from-a-type
 * @example
 * type MyType = {
 *   name: string;
 *   age?: number;
 *   email?: string;
 * }
 * type Keys = OptionalPropertyOf<MyType> = 'age' | 'email'
 */
type OptionalPropertyOf<T extends object> = Exclude<{
    [K in keyof T]: T extends Record<K, T[K]>
        ? never
        : K
}[keyof T], undefined>

/**
 * 挑出对象中的可选属性，并使其成为必选属性
 */
type PickOptionalPropertyAndRequire<T extends object> = Required<Pick<T, OptionalPropertyOf<T>>>;

/**
 * 使函数返回值为 Promise
 */
type PromiseReturn<T extends (...args: any) => any> = (...args: Parameters<T>) => Promise<ReturnType<T>>;

/**
 * 取出 Promise 中的值
 */
type UnPromisify<T> = T extends Promise<infer U> ? U : never;

/**
 * 对象的值类型
 */
type ValueOf<T> = T[keyof T];

/**
 * 按类型挑选值
 */
type PickByValueType<T, K> = {
    [key in keyof T]: T[key] extends K ? T[key] : never;
}
