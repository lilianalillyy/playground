import ora from "ora";

export class Spinner {
  /**
   * Shows a spinner until the passed spinner is resolved/rejected.
   *
   * @template {Promise<unknown>} T
   * @template {T extends Promise<infer U> ? U : T} R
   * @param {T<R>} promise
   * @param {string} title
   * @returns {Promise<R>}
   */
  public static promise<T extends Promise<unknown>>(
    promise: T,
    title: string = "Loading..."
  ): T {
    const spinner = ora().start(title);

    promise.finally(() => spinner.stopAndPersist());

    return promise;
  }
}
