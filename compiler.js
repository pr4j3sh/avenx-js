// compiler.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

let globalStyles = "";

function processCSS(html, cdsBlocks = []) {
    // Sucht nach <@css>...</@css> ODER <@css />
    const cssRegex = /<@css>([\s\S]*?)<\/ @css>|<@css\s*\/?>/g;
    let match;
    let modifiedHtml = html;

    const matches = [];
    while ((match = cssRegex.exec(html)) !== null) {
        matches.push(match);
    }

    // Wir verarbeiten die Blöcke von hinten nach vorne
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        let cssContent = (m[1] || "").trim();
        const fullMatch = m[0];
        const matchIndex = m.index;

        // Falls kein Inline-CSS da ist, nimm den nächsten Block aus der .cds
        if (!cssContent && cdsBlocks.length > 0) {
            cssContent = cdsBlocks[i] || "";
        }

        if (!cssContent) {
            modifiedHtml = modifiedHtml.replace(fullMatch, '');
            continue;
        }

        const hash = "tth-" + crypto.createHash('md5').update(cssContent).digest('hex').substring(0, 8);
        
        let baseRules = "";
        let nestedRules = "";
        
        // Robusterer Parser für CSS-Regeln und Blöcke
        let current = "";
        let depth = 0;
        for (let char of cssContent) {
            current += char;
            if (char === '{') depth++;
            else if (char === '}') depth--;
            
            if (depth === 0 && (char === ';' || char === '}')) {
                let rule = current.trim();
                if (rule.includes('{')) {
                    nestedRules += rule.replace(/&/g, `.${hash}`) + "\n";
                } else if (rule && rule !== ';') {
                    if (!rule.endsWith(';')) rule += ';';
                    baseRules += rule + " ";
                }
                current = "";
            }
        }
        if (current.trim()) {
            let rule = current.trim();
            if (rule.includes('{')) {
                nestedRules += rule.replace(/&/g, `.${hash}`) + "\n";
            } else if (rule && rule !== ';') {
                if (!rule.endsWith(';')) rule += ';';
                baseRules += rule + " ";
            }
        }

        if (baseRules.trim()) globalStyles += `.${hash} { ${baseRules} }\n`;
        if (nestedRules.trim()) globalStyles += nestedRules + "\n";

        const beforeMatch = modifiedHtml.substring(0, matchIndex);
        const lastTagStart = beforeMatch.lastIndexOf('<');
        
        if (lastTagStart !== -1 && beforeMatch[lastTagStart + 1] !== '/') {
            const tagContent = modifiedHtml.substring(lastTagStart, matchIndex);
            let updatedTag;
            if (tagContent.includes('class="')) {
                updatedTag = tagContent.replace('class="', `class="${hash} `);
            } else {
                // Wir suchen das Ende des Tags (das erste >) und fügen die Klasse davor ein
                updatedTag = tagContent.replace(/(\s*\/?>)/, ` class="${hash}"$1`);
            }
            
            modifiedHtml = modifiedHtml.substring(0, lastTagStart) + 
                           updatedTag + 
                           modifiedHtml.substring(matchIndex + fullMatch.length);
        } else {
            modifiedHtml = modifiedHtml.replace(fullMatch, '');
        }
    }
    return modifiedHtml;
}

function parseTTH(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(filePath, '.tth');
    const cdsPath = filePath.replace('.tth', '.cds');
    let cdsBlocks = [];

    if (fs.existsSync(cdsPath)) {
        const cdsContent = fs.readFileSync(cdsPath, 'utf-8');
        let current = "";
        let depth = 0;
        let inBlock = false;
        
        for (let i = 0; i < cdsContent.length; i++) {
            const char = cdsContent[i];
            if (!inBlock && cdsContent.substring(i, i + 4) === "@css") {
                inBlock = true;
                i += 3; // Überspringe @css
                continue;
            }
            if (inBlock) {
                if (char === '{') {
                    if (depth > 0) current += char;
                    depth++;
                } else if (char === '}') {
                    depth--;
                    if (depth > 0) current += char;
                    else {
                        cdsBlocks.push(current.trim());
                        current = "";
                        inBlock = false;
                    }
                } else if (depth > 0) {
                    current += char;
                }
            }
        }
    }

    const state = {};
    const stateMatch = content.match(/<state\s+(.*?)\s*\/>/);
    if (stateMatch) {
        stateMatch[1].match(/(\w+)="([^"]*)"/g)?.forEach(pair => {
            const [k, v] = pair.split('=');
            const val = v.replace(/"/g, '');
            state[k] = isNaN(val) ? val : Number(val);
        });
    }

    const methods = {};
    const actionRegex = /<action\s+name="(\w+)">([\s\S]*?)<\/action>/g;
    let m;
    while ((m = actionRegex.exec(content)) !== null) {
        methods[m[1]] = m[2].trim().replace(/\s+/g, ' ');
    }

    let template = content
        .replace(/<state.*? \/>/, '')
        .replace(/<action.*?>[\s\S]*?<\/action>/g, '')
        .trim();
    
    template = processCSS(template, cdsBlocks);

    const methodStrings = Object.entries(methods)
        .map(([k, v]) => `${k}: function() { ${v} }`).join(',\n        ');

    const js = `
class ${name} extends TTHComponent {
    constructor() {
        super(${JSON.stringify(state)});
        this._template = \`${template}\`;
        this.methods = { ${methodStrings} };
    }
}`;
    return { name, js };
}

function build() {
    globalStyles = "/* Generated by Hoe-JS (Zero-Classname / @css Tag) */\n";
    console.log("--- Hoe-JS Compiler ---");
    
    let bundleJs = fs.readFileSync(path.join(SRC_DIR, 'runtime.js'), 'utf-8').replace(/export /g, '');

    const compDir = path.join(SRC_DIR, 'components');
    if (fs.existsSync(compDir)) {
        fs.readdirSync(compDir).forEach(file => {
            if (file.endsWith('.tth')) {
                console.log(`[Compiling] ${file}`);
                const { js } = parseTTH(path.join(compDir, file));
                bundleJs += js;
            }
        });
    }

    const mainFile = path.join(SRC_DIR, 'main.hoe');
    if (fs.existsSync(mainFile)) {
        let main = fs.readFileSync(mainFile, 'utf-8').replace(/import.*?;/g, ''); 
        bundleJs += `\n(function(){\n${main}\n})();`;
    }

    fs.writeFileSync(path.join(DIST_DIR, 'bundle.js'), bundleJs);
    fs.writeFileSync(path.join(DIST_DIR, 'bundle.css'), globalStyles);
    console.log("-----------------------");
    console.log('Build erfolgreich: dist/bundle.js & dist/bundle.css');
}

build();
