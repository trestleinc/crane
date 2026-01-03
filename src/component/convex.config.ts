import workflow from "@convex-dev/workflow/convex.config";
import { defineComponent } from "convex/server";

const component = defineComponent("crane");
component.use(workflow);

export default component;
