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
    id: string,
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
        const name = p.textContent.replaceAll(/\s+/g, ' ').toUpperCase(); 
        const item: Item = {
            name: name,
            id: removeAccents(name).toLowerCase().replaceAll(/\s+/g, '-').replaceAll('(', '').replaceAll(')', ''),
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
    else if (current && (p.nodeName == "P" || p.nodeName == "UL")) {
        current.content += (<Element>p).outerHTML.replaceAll('<br>', '').replaceAll('<br/>', '').replaceAll('<br />', '');
    }
}

let opf = "";

let spine = "";

let toc = "";

function bestSrc(item: Item): string {
    let result = item.id;

    if (item.content == "" && item.childrens.length > 0) {
        result += `/${bestSrc(item.childrens[0])}`;
    }
    else if (item.content != "") {
        result += `${item.childrens.length > 0 ? "/index" : ""}.html`;
    } 

    return result;
}

function treat(parentName: string, depth: number): (item: Item) => void {
    return (item: Item) => {
        let hasChildrens = item.childrens.length > 0;

        let id = `${parentName.replaceAll('/', '-')}-${item.id}`;
        let location = `${parentName}/${item.id}${hasChildrens ? "/index" : ""}.html`;

        toc += `<navPoint id="${id}">
                    <navLabel>
                        <text>${item.name}</text>
                    </navLabel>`;

        if (item.content != "") {
            opf += `<item id="${id}" href="${location}" media-type="application/xhtml+xml" />\n`; 
            spine += `<itemref idref="${id}" linear="yes" />\n`;
            toc += `<content src="${location}"/>\n`;
            ensureFileSync(location);
            Deno.writeTextFileSync(location, `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt">
            <head>
                <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
                <title>${item.name}</title>
                <link href="${folderBack(depth + (hasChildrens ? 1 : 0))}style.css" rel="stylesheet" type="text/css" />
            </head>  
            <body><h2>${item.name}</h2>${item.content}</body>     
            </html>`); 
        }
        else {
            toc += `<content src="${parentName}/${bestSrc(item)}"/>\n`;
        }   
            
        if (hasChildrens) {
            item.childrens.forEach(treat(`${parentName}/${item.id}`, depth + 1));
        }

        toc += "</navPoint>\n";
    };
}

root.forEach(treat(group, 1));

const groupFile = group.replaceAll('/','-');

Deno.writeTextFileSync(`_${groupFile}-opf.xhtml`, opf); 

Deno.writeTextFileSync(`_${groupFile}-spine.xhtml`, spine); 

Deno.writeTextFileSync(`_${groupFile}-ncx.xhtml`, toc); 