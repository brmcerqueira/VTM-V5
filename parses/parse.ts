import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { ensureFileSync } from "https://deno.land/std@/fs/mod.ts";

function removeAccents(text: string): string {
    const accents =
      "ÀÁÂÃÄÅàáâãäåßÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž";
    const accentsOut =
      "AAAAAAaaaaaaBOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
    return text.split("")
      .map((letter, index) => {
        const accentIndex = accents.indexOf(letter);
        return accentIndex !== -1 ? accentsOut[accentIndex] : letter;
      })
      .join("");
  }

let index = parseInt(Deno.args[0]);
const group = Deno.args[1];
const html = await Deno.readTextFile(Deno.args[2]);

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

let opf = "";

let toc = "";

function treat(parentName?: string): (item: Item) => void {
    return (item: Item) => {
        let hasChildrens = item.childrens.length > 0;
        let name = removeAccents(item.name).toLowerCase().replaceAll(/\s+/g, '-');
        let id = `${group}${parentName ? `-${parentName}` : ""}-${name}`;
        let location = `${group}${parentName ? `/${parentName}` : ""}/${name}.html`;
        opf += `<item id="${id}" href="${location}" media-type="application/xhtml+xml" />\n`;
        toc += `<navPoint id="${id}" playOrder="${index++}">
                    <navLabel>
                        <text>${item.name.replaceAll(/\s+/g, ' ').toUpperCase()}</text>
                    </navLabel>
                    <content src="${location}"/>\n`;
        if (hasChildrens) {
            item.childrens.forEach(treat(name));
        }
        toc += "</navPoint>\n";
        ensureFileSync(location);
        Deno.writeTextFileSync(location, item.content);
    };
}

root.forEach(treat());

console.log(opf);

console.log(toc);