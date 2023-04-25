import { Frontend } from "../frontend/Frontend.js";
import { Provider } from "../providers/Provider.js";

export abstract class AbstractRecreator {
  constructor(
    protected provider: Provider,
    protected forceYes: boolean = false
  ) {}

  public async run(): Promise<void> {
    throw new Error("Not implemented");
  }

  protected async serve(
    template: string,
    args: Record<string, any>
  ): Promise<void> {
    return new Frontend(template, args).serve();
  }
}
