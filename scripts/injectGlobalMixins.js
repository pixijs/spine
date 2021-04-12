// The File is not used for now!

const { RushConfiguration } = require('@microsoft/rush-lib');
const path = require('path');
const fs = require('fs');

/**
 * Gets all the non-private packages package.json data
 */
function getSortedPackages()
{
    const config = RushConfiguration.loadFromDefaultLocation({
        startingFolder: process.cwd()
    });

    return config.projects
        .map((project) => project.projectFolder)
        .map((pkgPath) => ({
            ...fs.readFileSync(path.join(pkgPath, 'package.json'), { encoding: 'utf8' }),
            location: pkgPath,
        }))
}

/**
 * Adds global reference to the start of a packages `index.d.ts` file
 */
function writeToIndex(basePath, dataToWrite)
{
    const indexDtsPath = path.resolve(basePath, './index.d.ts');
    const file = fs.readFileSync(indexDtsPath, { encoding: 'utf8' }).toString().split('\n');

    file.unshift(dataToWrite);
    fs.writeFileSync(indexDtsPath, file.join('\n'));
}

/**
 * This is a workaround for https://github.com/pixijs/pixi.js/issues/6993
 *
 * All this script does is inject a path reference into a packages `index.d.ts` if a `global.d.ts`
 * exists.
 */
function start()
{
    const packages = getSortedPackages();

    packages.forEach((pkg) =>
    {
        const basePath = path.relative(process.cwd(), pkg.location);
        const globalDtsPath = path.resolve(basePath, './global.d.ts');

        if (fs.existsSync(globalDtsPath))
        {
            const packageTypeData = `/// <reference path="./global.d.ts" />\n`;

            writeToIndex(basePath, packageTypeData);
        }
    });

}

start();
