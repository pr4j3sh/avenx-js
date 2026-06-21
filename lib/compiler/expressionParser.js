/**
 * ExpressionParser is responsible for extracting state, computed properties,
 * and methods from Avenx component source code.
 */
class ExpressionParser {
    /**
     * Extracts the initial state from <state /> tags.
     * @param {string} content - The component source code.
     * @returns {Object} The extracted state object.
     */
    parseState(content) {
        const state = {};
        const match = content.match(/<state\s+([\s\S]*?)\s*\/>/);
        if (match) {
            match[1].match(/(\w+)="([^"]*)"/g)?.forEach(pair => {
                const [k, v] = pair.split('=');
                const val = v.replace(/"/g, '');
                state[k] = (val.trim() === '' || isNaN(val)) ? val : Number(val);
            });
        }
        return state;
    }

    /**
     * Extracts computed property definitions from <computed /> tags.
     * @param {string} content - The component source code.
     * @returns {Object} A map of computed property names to their expressions.
     */
    parseComputed(content) {
        const computed = {};
        const regex = /<computed\s+name="(\w+)"\s+value="([^"]*)"\s*\/>/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            computed[m[1]] = m[2];
        }
        return computed;
    }

    /**
     * Extracts method definitions from <action /> tags.
     * @param {string} content - The component source code.
     * @returns {Object} A map of method names to their source code.
     */
    parseMethods(content) {
        const methods = {};
        const actionRegex = /<action\s+name="(\w+)">([\s\S]*?)<\/action>/g;
        let m;
        while ((m = actionRegex.exec(content)) !== null) {
            methods[m[1]] = m[2].trim().replace(/\s+/g, ' ');
        }
        return methods;
    }
}

module.exports = ExpressionParser;

