import {AsyncArray} from "./AsyncArray.js";
import * as util from "util";

declare global {
    type ArrayResolvable<T> = Promise<T> | (() => Promise<T>) | (() => T);
    
    interface ArrayInterface<T> {
        add<T>(this: T[], ...values: T[]): Array<T>;

        addResult<T>(this: T[], result: ArrayResolvable<T>): Promise<Array<T>>;

        remove(...indexes: number[]): Array<T>;

        removeElement(element: T): Array<T>;

        removeElements(...elements: T[]): Array<T>;

        makeUnique(): Array<T>;

        mapAsync<T, U>(this: T[], cb: (value: T, index: number, array: T[]) => Promise<U>): Promise<U[]>;

        filterAsync<T>(this: T[], cb: (value: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]>;
    }

    interface Array<T> extends ArrayInterface<T> {
    }
}

if (!Array.prototype.add) {
    Array.prototype.add = function<T>(this: T[], ...values: T[]): Array<T> {
        this.push(...values);
        return this;
    }
}

if (!Array.prototype.addResult) {
    Array.prototype.addResult = async function <T>(this: T[], resolvable: ArrayResolvable<T>): Promise<Array<T>> {
        let result = typeof resolvable === "function" ? resolvable() : resolvable;
        result = util.types.isPromise(result) ? await result : result;

        return this.add(result);
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function <T>(this: T[], ...indexes: number[]): Array<T> {
        for (const index of indexes) {
            if (!(index in this)) continue;
            this.splice(index, 1);
        }
        return this;
    }
}

if (!Array.prototype.removeElement) {
    Array.prototype.removeElement = function <T>(this: T[], element: T): Array<T> {
        return this.remove(this.indexOf(element));
    }
}

if (!Array.prototype.removeElements) {
    Array.prototype.removeElements = function <T>(this: T[], ...elements: T[]): Array<T> {
        return this.remove(...elements.map(el => this.indexOf(el)));
    }
}

if (!Array.prototype.makeUnique) {
    Array.prototype.makeUnique = function <T>(this: T[]): Array<T> {
        const nonUniqueIndexes = this
            .map((item, index, arr) => index !== arr.indexOf(item) ? index : null)
            .filter(v => !!v) as number[];

        for (const index of nonUniqueIndexes) {
            this.remove(index);
        }

        return this;
    }
}

if (!Array.prototype.mapAsync) {
    Array.prototype.mapAsync = async function<T, U>(
        this: T[], cb: (value: T, index: number, array: T[]) => Promise<U>
    ): Promise<U[]> {
        return AsyncArray.map<T, U>(this, cb);
    }
}

if (!Array.prototype.filterAsync) {
    Array.prototype.filterAsync = async function<T>(
        this: T[], cb: (value: T, index: number, array: T[]) => Promise<boolean>
    ): Promise<T[]> {
        return AsyncArray.filter<T>(this, cb);
    }
}