import { Sort as SortClass } from "./Sort.js";

declare global {
    class Sort extends SortClass {}
}

if (!Sort) {
    (global as any).Sort = Sort    
}