import { Spinner as SpinnerClass } from "./Spinner.js";

declare global {
    namespace Cli {
        class Spinner extends SpinnerClass {}
    }
}

if (!global.Cli) {
    global.Cli = {
        Spinner: SpinnerClass
    };
} else if (!global.Cli.Spinner) {
    global.Cli.Spinner = SpinnerClass;
}