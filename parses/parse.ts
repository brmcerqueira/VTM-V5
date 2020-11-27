import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const html = await Deno.readTextFile(Deno.args[0]);

const doc = new DOMParser().parseFromString(html, "text/html")!;

for (const p of doc.querySelectorAll("*")) {
    if (p.nodeName == "H2" || p.nodeName == "H3" || p.nodeName == "H4") {
        console.log('nodeName ->', p.nodeName);
        console.log(p.textContent.toUpperCase());
    }
    else if (p.nodeName == "P") {
        console.log((<Element>p).outerHTML);
    }
}