// @ts-ignore
import sort from "leven-sort"

export class Sort {
    /**
     * Uses the Levenshtein distance algorithm (implemented via the 'leven-sort' library) 
     * to sort objects by comparing `value` against the object's `property`.
     * 
     * For example, given `sort([{n: 'Zeia'}, {n: 'Mariana'}, {n: 'Mariette'}], 'n', 'Maria')`
     * the sorted array will be `[{n: 'Mariana'}, {n: 'Mariette}, {n: 'Zeia'}]`.
     * 
     * @param {T} array 
     * @param {K} property 
     * @param {string} value 
     * @returns 
     */
    public static levenSortObjectArray<
    T extends Record<string, any> & { [k in K]: string },
    K extends keyof T
  >(array: T[], property: K, value: string): T[] {
    return sort(array, value, property) as T[];
  }
}
