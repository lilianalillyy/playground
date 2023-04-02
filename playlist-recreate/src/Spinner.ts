import ora from "ora";
import { nextTick } from "process";

export class Spinner {
    static promise<T, TPromise extends Promise<T>>(
        promise: TPromise, title: string = "Loading..."
    ): TPromise {
        return new Promise((res, rej) => {
            const spinner = ora(title).start();
            promise.then((val) => {
                spinner.stopAndPersist();
                nextTick(() => res(val));
            }).catch((err) => {
                spinner.stopAndPersist();
                nextTick(() => rej(err));
            })
        }) as TPromise;
    }
}