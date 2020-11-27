import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const html = await Deno.readTextFile(Deno.args[0]);

const doc = new DOMParser().parseFromString(html, "text/html")!;

type Item = {
    name: string,
    content: string,
    depth: number,
    childrens: Item[]
}

let root: Item[] = [];

let queue: Item[] = [];

let current: Item | null = null;

for (const p of doc.querySelectorAll("*")) {
    let depth = 0;

    switch (p.nodeName) {
        case "H2":
            depth = 1;
            break;
        case "H3":
            depth = 2;
            break;
        case "H4":
            depth = 3;
            break;
    }

    if (depth > 0) {  
        let item: Item = {
            name: p.textContent.toUpperCase(),
            content: "",
            depth: depth,
            childrens: []
        };

        if (depth == 1) {  
            root.push(item);
            queue.length = 0;
            queue.push(item);
        }
        else {    
            let last = queue[queue.length - 1];
            if (last.depth < depth) {
                last.childrens.push(item);
                queue.push(item);            
            }
            else {
                if (last.depth > depth) {
                    queue.pop();
                }
                queue[queue.length - 1] = item;

                if (queue.length > 1) {
                    queue[queue.length - 2].childrens.push(item);
                }      
            }    
        }

        current = item;
    }
    else if (p.nodeName == "P") {
        if (current) {
            current.content += (<Element>p).outerHTML.replaceAll('<br>', '').replaceAll('<br/>', '').replaceAll('<br />', '');
        }
    }
}

console.log(root[1]);