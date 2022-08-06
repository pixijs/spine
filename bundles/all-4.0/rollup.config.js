const { main } = require('@pixi-spine/rollup-config/main');
const pkg = require('./package.json');

const results = main({
    globals: {
        '@pixi-spine/base': 'PIXI.spine',
        '@pixi-spine/runtime-4.0': 'PIXI.spine40',
        '@pixi-spine/loader-base': 'PIXI.spine',
        '@pixi-spine/loader-4.0': 'PIXI.spine',
    },
});

// Find all the peer deps. Note: This assumes we have only two levels of peer deps.
let umdDeps = [];
const deps = Object.keys(pkg.dependencies || {});
for (let dep of deps) {
    const p = require(`${dep}/package.json`);
    umdDeps = umdDeps.concat(Object.keys(p.peerDependencies || {}));
}


const license1 = 'is licensed under the MIT License.\n * http://www.opensource.org/licenses/mit-license';
const licenseSpine = 'is licensed under SPINE-LICENSE\n * http://esotericsoftware.com/spine-runtimes-license';

results.forEach((entry) => {
    if (entry.output.banner) {
        entry.output.banner = entry.output.banner.replace(license1, licenseSpine);
    }
    if (entry.output.format === 'umd') {
        entry.external = entry.external.filter((moduleName) => {
            return moduleName.indexOf('@pixi-spine') !== 0;
        }).concat(umdDeps);
    }
})

module.exports = results;
