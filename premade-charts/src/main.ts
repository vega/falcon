/**
 * Write a js export wrapper here for the components at some point
 */
import App from "./App.svelte";

const app = new App({
    target: document.getElementById("app"),
});

export default app;
