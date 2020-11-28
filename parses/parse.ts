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

function folderBack(amount: number): string {
    let result = "";

    for (let index = 0; index < amount; index++) {
        result += "../";
    }
   
    return result;
}

const group = Deno.args[0];
const html = await Deno.readTextFile(Deno.args[1]);

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

let spine = "";

let toc = "";

function treat(parentName: string): (item: Item) => void {
    return (item: Item) => {
        let hasChildrens = item.childrens.length > 0;
        let label = item.name.replaceAll(/\s+/g, ' ').toUpperCase();
        let name = removeAccents(item.name).toLowerCase().replaceAll(/\s+/g, '-').replaceAll('(', '').replaceAll(')', '');
        let id = `${parentName.replaceAll('/', '-')}-${name}`;
        let location = `${parentName}/${name}${hasChildrens ? "/index" : ""}.html`;

        toc += `<navPoint id="${id}">
                    <navLabel>
                        <text>${label}</text>
                    </navLabel>`;

        if (item.content != "") {
            opf += `<item id="${id}" href="${location}" media-type="application/xhtml+xml" />\n`; 
            spine += `<itemref idref="${id}" linear="yes" />\n`;
        }   
            
        toc += `<content src="${item.content != "" ? location : "none.html"}"/>\n`;

        if (hasChildrens) {
            item.childrens.forEach(treat(`${parentName}/${name}`));
        }

        toc += "</navPoint>\n";
        if (item.content != "") {
            ensureFileSync(location);
            Deno.writeTextFileSync(location, `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt">
            <head>
                <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
                <title>${label}</title>
                <link href="${folderBack(item.depth + (hasChildrens ? 1 : 0))}style.css" rel="stylesheet" type="text/css" />
            </head>  
            <body><h2>${label}</h2>${item.content}</body>     
            </html>`); 
        }
    };
}

root.forEach(treat(group));

Deno.writeTextFileSync(`_${group}-opf.xhtml`, opf); 

Deno.writeTextFileSync(`_${group}-spine.xhtml`, spine); 

Deno.writeTextFileSync(`_${group}-toc.xhtml`, toc); 