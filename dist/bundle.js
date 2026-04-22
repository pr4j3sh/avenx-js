// src/runtime.js
class TTHComponent {
    constructor(initialState = {}) {
        this.element = null;
        this._template = '';
        this.methods = {};
        const self = this;

        // Reaktivität: Proxy triggert Re-Render bei Änderungen
        this.state = new Proxy(initialState, {
            set(target, key, value) {
                target[key] = value;
                self.update();
                return true;
            },
            get(target, key) {
                return target[key];
            }
        });
    }

    // Führt Inline-Code (@click) im Kontext der Komponente aus
    _execute(code) {
        const context = { ...this.state, ...this.methods };
        try {
            const fn = new Function(...Object.keys(context), `with(this) { ${code} }`);
            fn.call(this.state, ...Object.values(context));
        } catch (e) { console.error("TTH Exec Error:", e); }
    }

    render() {
        let html = this._template;
        // Einfache {{ var }} Interpolation
        return html.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
            const context = { ...this.state };
            try {
                return new Function(...Object.keys(context), `return ${expr}`).call(this.state, ...Object.values(context));
            } catch (e) { return ''; }
        });
    }

    update() {
        if (!this.element) return;
        this.element.innerHTML = this.render();
        this._bindEvents();
    }

    _bindEvents() {
        this.element.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('@')) {
                    const event = attr.name.substring(1);
                    el.addEventListener(event, (e) => {
                        e.preventDefault();
                        this._execute(attr.value);
                    });
                }
            });
        });
    }

    mount(target) {
        this.element = target;
        this.update();
    }
}

class HoeApp {
    constructor(config) {
        this.target = document.querySelector(config.target);
        this.components = new Map();
    }
    register(name, compClass) { this.components.set(name, compClass); }
    mount(name) {
        const Comp = this.components.get(name);
        if (Comp) new Comp().mount(this.target);
    }
}

class Counter extends TTHComponent {
    constructor() {
        super({"count":0,"step":1});
        this._template = `<div class="tth-5edb3d4e">
    

    <h1 @click="count = 0" class="tth-3d4b3f98">
        
        Hoe-JS @css PoC
    </h1>
    
    <div class="tth-3c8dfc19">
        
        {{ count }}
    </div>

    <button @click="count += step; log()" class="tth-44fd2c92">
        
        Erhöhen (+{{ step }})
    </button>
</div>`;
        this.methods = { log: function() { console.log("Neuer Stand:", count); } };
    }
}
(function(){
// src/main.hoe



const app = new HoeApp({ target: '#app' });

app.register('Counter', Counter);
app.mount('Counter');

})();